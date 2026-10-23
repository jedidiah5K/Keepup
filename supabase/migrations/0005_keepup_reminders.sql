-- Reminders as push notifications (the home-screen app on iPhone iOS 16.4+, and Android).
-- Every 5 minutes a scheduled job calls the keepup-reminders edge function. That asks
-- keepup_due_reminders() what is due right now and sends it to each phone in keepup_push_tokens.
-- A reminder is only due if the habit isn't done yet today and the person isn't on a break,
-- and each one is sent at most once a day (keepup_push_sent remembers).
-- High fives: like a nudge, but for a friend who got everything done today. Same table, own kind.
alter table public.keepup_nudges add column if not exists kind text not null default 'nudge' check (kind in ('nudge', 'five'));
alter table public.keepup_nudges drop constraint if exists keepup_nudges_from_user_to_user_date_key;
create unique index if not exists keepup_nudges_once on public.keepup_nudges (from_user, to_user, date, kind);
create index if not exists keepup_nudges_recent on public.keepup_nudges (to_user, created_at);

create or replace function public.keepup_high_five(sq uuid, friend uuid, local_day date) returns void
language plpgsql security definer set search_path = public as $$
begin
  if friend = auth.uid() then raise exception 'You can’t high-five yourself.'; end if;
  if not exists (select 1 from keepup_squad_members a join keepup_squad_members b on a.squad_id = b.squad_id
                 where a.squad_id = sq and a.user_id = auth.uid() and b.user_id = friend) then raise exception 'Not in this squad.'; end if;
  if abs(local_day - current_date) > 1 then raise exception 'Bad date'; end if;
  insert into keepup_nudges (squad_id, from_user, to_user, date, kind) values (sq, auth.uid(), friend, local_day, 'five');
exception when unique_violation then raise exception 'You already high-fived them today.';
end $$;
revoke all on function public.keepup_high_five(uuid, uuid, date) from public, anon;
grant execute on function public.keepup_high_five(uuid, uuid, date) to authenticated;

create table if not exists public.keepup_push_sent (
  user_id uuid not null references public.keepup_profiles (id) on delete cascade,
  what text not null,                 -- a habit id, or 'evening'
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, what, day)
);
alter table public.keepup_push_sent enable row level security;  -- no policies: server only

create or replace function public.keepup_due_reminders(lookback interval default '15 minutes')
returns table (user_id uuid, title text, body text, tag text)
language sql security definer set search_path = public as $$
  with people as (
    select p.id, p.evening_reminder_at, p.week_start, l.local_now, l.local_now::date as d
    from keepup_profiles p
    cross join lateral (select now() at time zone p.timezone as local_now) l
    where p.timezone in (select name from pg_timezone_names)
      and exists (select 1 from keepup_push_tokens t where t.user_id = p.id and t.kind = 'webpush')
      and not exists (select 1 from keepup_breaks b where b.user_id = p.id
                      and (now() at time zone p.timezone)::date between b.start_date and b.end_date)
  ),
  -- Habits due today and not done yet (x-a-week ones: while the week's target isn't met).
  open_habits as (
    select pp.id as uid, pp.d, pp.local_now, h.id as hid, h.name, h.reminder_time, h.schedule_type
    from people pp join keepup_habits h on h.user_id = pp.id
    where h.archived_at is null and h.start_date <= pp.d
      and (h.schedule_type <> 'weekdays' or extract(isodow from pp.d)::smallint = any (h.schedule_days))
      and coalesce((select c.count from keepup_checkins c where c.habit_id = h.id and c.date = pp.d), 0) < h.target_count
      and (h.schedule_type <> 'x_per_week' or (
        select count(*) from keepup_checkins c
        where c.habit_id = h.id and c.count >= h.target_count and c.date < pp.d
          and c.date >= pp.d - ((extract(isodow from pp.d)::int - pp.week_start + 7) % 7)) < h.times_per_week)
  ),
  candidates as (
    select o.uid, o.hid::text as what, o.d, o.name as title,
           'Still on for today. Tap to tick it off.' as body, 'h-' || o.hid as tag
    from open_habits o
    where o.reminder_time is not null
      and o.d + o.reminder_time > o.local_now - lookback and o.d + o.reminder_time <= o.local_now
    union all
    select pp.id, 'evening', pp.d, 'Evening check',
           case when n.left_ = 1 then '1 habit left today. There’s still time.'
                else n.left_ || ' habits left today. There’s still time.' end,
           'evening'
    from people pp
    cross join lateral (select count(*) as left_ from open_habits o where o.uid = pp.id and o.schedule_type <> 'x_per_week') n
    where pp.evening_reminder_at is not null and n.left_ > 0
      and pp.d + pp.evening_reminder_at > pp.local_now - lookback and pp.d + pp.evening_reminder_at <= pp.local_now
    union all
    -- Nudges and high fives from the squad, sent on as they come in.
    select pp.id, 'n' || x.id, pp.d,
           coalesce(nullif(f.display_name, ''), 'A friend') || case when x.kind = 'five' then ' high-fived you' else ' nudged you' end,
           case when x.kind = 'five' then 'For getting everything done today.' else 'Still time to tick off today’s habits.' end,
           x.kind || '-' || x.from_user
    from people pp join keepup_nudges x on x.to_user = pp.id and x.created_at > now() - lookback
    join keepup_profiles f on f.id = x.from_user
  ),
  claimed as (
    insert into keepup_push_sent (user_id, what, day)
    select uid, what, d from candidates
    on conflict do nothing
    returning keepup_push_sent.user_id, keepup_push_sent.what, keepup_push_sent.day
  )
  select c.uid, c.title, c.body, c.tag
  from candidates c join claimed k on k.user_id = c.uid and k.what = c.what and k.day = c.d
$$;
revoke all on function public.keepup_due_reminders(interval) from public, anon, authenticated;
grant execute on function public.keepup_due_reminders(interval) to service_role;

-- Old send records aren't needed after a couple of days.
create or replace function public.keepup_push_sent_tidy() returns void language sql security definer set search_path = public as $$
  delete from keepup_push_sent where day < current_date - 3
$$;
revoke all on function public.keepup_push_sent_tidy() from public, anon, authenticated;
grant execute on function public.keepup_push_sent_tidy() to service_role;

-- Save this phone's push address for the signed-in person. Only the phone itself knows the address,
-- so if it was saved under another account on this phone before, it moves to whoever is signed in now.
create or replace function public.keepup_save_push(endpoint text, keys jsonb, label text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if endpoint !~ '^https://' or char_length(endpoint) > 1000 or not (keys ? 'p256dh' and keys ? 'auth') or char_length(keys::text) > 500 then
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
