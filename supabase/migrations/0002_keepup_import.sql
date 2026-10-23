-- KeepUp: bring a phone's history into an account on first sign-in.
-- Normal check-in writes only allow the last 7 days. Someone who used KeepUp without an account
-- for months needs their older days uploaded once. This function takes the phone's habits and
-- check-ins and adds them for the signed-in person only. Older days are only ever added, never
-- changed, so it can't be used to rewrite history the server already has.

create or replace function public.keepup_import(p_habits jsonb, p_checkins jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n int := 0; h jsonb; c jsonb;
begin
  if me is null then raise exception 'Sign in first'; end if;
  if jsonb_typeof(p_habits) <> 'array' or jsonb_typeof(p_checkins) <> 'array' then raise exception 'Bad data'; end if;
  if jsonb_array_length(p_habits) > 300 or jsonb_array_length(p_checkins) > 60000 then raise exception 'Too much data'; end if;
  insert into keepup_profiles (id) values (me) on conflict do nothing;

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
    if (c->>'date')::date > current_date + 1 or (c->>'date')::date < date '2000-01-01' then continue; end if;
    if not exists (select 1 from keepup_habits where id = (c->>'habit_id')::uuid and user_id = me) then continue; end if;
    insert into keepup_checkins (habit_id, user_id, date, count)
    values ((c->>'habit_id')::uuid, me, (c->>'date')::date, least(1000, greatest(1, (c->>'count')::int)))
    on conflict (habit_id, date) do update set count = excluded.count, updated_at = now()
      where keepup_checkins.date >= current_date - 8;   -- older days: add only, never change
    n := n + 1;
  end loop;
  perform set_config('keepup.importing', 'off', true);
  return n;
end $$;

-- The check-in guard lets the import above through (it sets keepup.importing for its own transaction only;
-- a person can't set it from outside because they can only call functions, not run SQL).
create or replace function public.keepup_checkin_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('keepup.importing', true), 'off') <> 'on' then
    if new.date < current_date - 8 or new.date > current_date + 1 then raise exception 'Only the last 7 days can be changed'; end if;
  end if;
  if tg_op = 'UPDATE' and old.date <> new.date then raise exception 'Date cannot change'; end if;
  if not exists (select 1 from keepup_habits h where h.id = new.habit_id and h.user_id = new.user_id) then raise exception 'Not your habit'; end if;
  new.updated_at := now();
  return new;
end $$;

revoke all on function public.keepup_import(jsonb, jsonb) from public, anon;
grant execute on function public.keepup_import(jsonb, jsonb) to authenticated;
