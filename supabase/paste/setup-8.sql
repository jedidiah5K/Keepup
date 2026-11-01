-- Paste into Supabase → "JobDone" project → SQL Editor → New query → Run.
-- Setup 8 (squad code checks need an account and are rate-limited; push addresses must be real push services).

-- Setup 8: security fixes. Safe to run twice.
-- 1. Checking a squad code (the preview) needs an account and is limited to 30 an hour, like joining
--    (10 an hour), so codes can't be guessed through the preview instead.
-- 2. Push addresses must belong to a real push service, so the reminder server never posts anywhere else.
--    They can only be saved through keepup_save_push (which checks them), not written to the table directly.
-- 3. Removing someone from a squad gives it new codes, so they can't rejoin with the old one.
-- 4. Days older than a week can be uploaded once per account (the first phone with history), not any time.
-- 5. The unused feedback table no longer accepts writes.

create or replace function public.keepup_invite_preview(code text) returns table (name text, members int, full_squad boolean)
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); tries int;
begin
  if uid is null then raise exception 'Sign in first'; end if;
  select count(*) into tries from keepup_security_events where user_id = uid and kind = 'preview_try' and created_at > now() - interval '1 hour';
  if tries >= 30 then raise exception 'Too many tries. Wait an hour and try again.'; end if;
  insert into keepup_security_events (user_id, kind) values (uid, 'preview_try');
  return query
    select s.name, count(m.*)::int, count(m.*) >= case when keepup_is_pro(s.owner_id) then 15 else 5 end
    from keepup_squads s left join keepup_squad_members m on m.squad_id = s.id
    where s.invite_code = code or s.join_code = keepup_norm_code(code) group by s.id;
end $$;
revoke all on function public.keepup_invite_preview(text) from public, anon;
grant execute on function public.keepup_invite_preview(text) to authenticated;
create index if not exists keepup_security_events_user on public.keepup_security_events (user_id, kind, created_at);

-- Chrome, Edge, Firefox and Safari push services.
create or replace function public.keepup_push_host_ok(endpoint text) returns boolean language sql immutable set search_path = public as $$
  select endpoint ~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/'
$$;
revoke all on function public.keepup_push_host_ok(text) from public, anon;

create or replace function public.keepup_save_push(endpoint text, keys jsonb, label text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not keepup_push_host_ok(endpoint) or char_length(endpoint) > 1000 or not (keys ? 'p256dh' and keys ? 'auth') or char_length(keys::text) > 500 then
    raise exception 'Not a push address';
  end if;
  if (select count(*) from keepup_push_tokens where user_id = auth.uid()) >= 10 then
    delete from keepup_push_tokens where id = (select id from keepup_push_tokens where user_id = auth.uid() order by last_seen_at limit 1);
  end if;
  insert into keepup_push_tokens (user_id, kind, token, keys, device_label)
  values (auth.uid(), 'webpush', endpoint, jsonb_build_object('p256dh', keys->>'p256dh', 'auth', keys->>'auth'), left(label, 60))
  on conflict (token) do update set user_id = excluded.user_id, keys = excluded.keys, device_label = excluded.device_label, last_seen_at = now();
end $$;
revoke all on function public.keepup_save_push(text, jsonb, text) from public, anon;
grant execute on function public.keepup_save_push(text, jsonb, text) to authenticated;
-- The app only deletes its own push address directly (on sign-out); saving goes through the function above.
revoke insert, update on public.keepup_push_tokens from anon, authenticated;
-- Nothing in the app sends feedback yet.
revoke insert on public.keepup_feedback from anon, authenticated;

-- 3. New codes after removing someone.
create or replace function public.keepup_remove_member(sq uuid, member uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from keepup_squads where id = sq and owner_id = auth.uid()) then raise exception 'Only the squad owner can remove people.'; end if;
  if member = auth.uid() then raise exception 'Use Leave squad instead.'; end if;
  delete from keepup_squad_shared_habits s using keepup_habits h where s.squad_id = sq and h.id = s.habit_id and h.user_id = member;
  delete from keepup_squad_members where squad_id = sq and user_id = member;
  update keepup_squads set join_code = keepup_new_code(),
    invite_code = translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_') where id = sq;
end $$;

-- 4. Same as setup 2's import, except days older than a week are only added the first time an account
--    receives old days. After that the 7-day lock applies to imports too.
create or replace function public.keepup_import(p_habits jsonb, p_checkins jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n int := 0; h jsonb; c jsonb; d date;
  old_ok boolean; had_old boolean := false;
begin
  if me is null then raise exception 'Sign in first'; end if;
  if jsonb_typeof(p_habits) <> 'array' or jsonb_typeof(p_checkins) <> 'array' then raise exception 'Bad data'; end if;
  if jsonb_array_length(p_habits) > 300 or jsonb_array_length(p_checkins) > 60000 then raise exception 'Too much data'; end if;
  insert into keepup_profiles (id) values (me) on conflict do nothing;
  old_ok := not exists (select 1 from keepup_security_events where user_id = me and kind = 'import_old');

  for h in select * from jsonb_array_elements(p_habits) loop
    -- Skip ids that already belong to someone else.
    if exists (select 1 from keepup_habits where id = (h->>'id')::uuid and user_id <> me) then continue; end if;
    insert into keepup_habits (id, user_id, name, icon, colour, kind, target_count, schedule_type, schedule_days,
                               times_per_week, reminder_time, sort_order, start_date, archived_at, created_at, updated_at)
    values ((h->>'id')::uuid, me, left(btrim(coalesce(h->>'name', 'Habit')), 60), left(coalesce(h->>'icon', '✅'), 32),
            left(coalesce(h->>'colour', 'tangerine'), 20), coalesce(h->>'kind', 'yes_no'), coalesce((h->>'target_count')::int, 1),
            coalesce(h->>'schedule_type', 'daily'),
            coalesce((select array_agg(x::smallint) from jsonb_array_elements_text(h->'schedule_days') x), '{}'),
            (h->>'times_per_week')::smallint, (h->>'reminder_time')::time, coalesce((h->>'sort_order')::int, 0),
            coalesce((h->>'start_date')::date, current_date), (h->>'archived_at')::timestamptz,
            coalesce((h->>'created_at')::timestamptz, now()), coalesce((h->>'updated_at')::timestamptz, now()))
    on conflict (id) do update set
      name = excluded.name, icon = excluded.icon, colour = excluded.colour, kind = excluded.kind,
      target_count = excluded.target_count, schedule_type = excluded.schedule_type, schedule_days = excluded.schedule_days,
      times_per_week = excluded.times_per_week, reminder_time = excluded.reminder_time, sort_order = excluded.sort_order,
      start_date = least(keepup_habits.start_date, excluded.start_date), archived_at = excluded.archived_at, updated_at = excluded.updated_at
    where keepup_habits.updated_at < excluded.updated_at;
  end loop;

  -- The guard trigger only allows recent days, so switch it off for this one insert.
  perform set_config('keepup.importing', 'on', true);
  for c in select * from jsonb_array_elements(p_checkins) loop
    d := (c->>'date')::date;
    if d > current_date + 1 or d < date '2000-01-01' then continue; end if;
    if d < current_date - 8 then if not old_ok then continue; end if; had_old := true; end if;
    if not exists (select 1 from keepup_habits where id = (c->>'habit_id')::uuid and user_id = me) then continue; end if;
    insert into keepup_checkins (habit_id, user_id, date, count)
    values ((c->>'habit_id')::uuid, me, d, least(1000, greatest(1, (c->>'count')::int)))
    on conflict (habit_id, date) do update set count = excluded.count, updated_at = now()
      where keepup_checkins.date >= current_date - 8;   -- older days: add only, never change
    n := n + 1;
  end loop;
  perform set_config('keepup.importing', 'off', true);
  if had_old then insert into keepup_security_events (user_id, kind) values (me, 'import_old'); end if;
  return n;
end $$;
revoke all on function public.keepup_import(jsonb, jsonb) from public, anon;
grant execute on function public.keepup_import(jsonb, jsonb) to authenticated;
