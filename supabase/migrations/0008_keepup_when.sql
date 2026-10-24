-- Habits can belong to a part of the day (Today groups them) and carry an "After…" cue,
-- like "After my morning coffee". Both are optional. Also: a habit can be skipped for a day
-- (stored as a check-in with count 0), and gets no reminder that day.
alter table public.keepup_habits add column if not exists time_of_day text;
alter table public.keepup_habits add column if not exists cue text;
alter table public.keepup_habits drop constraint if exists keepup_habits_time_of_day_ok;
alter table public.keepup_habits add constraint keepup_habits_time_of_day_ok check (time_of_day is null or time_of_day in ('morning', 'afternoon', 'evening'));
alter table public.keepup_habits drop constraint if exists keepup_habits_cue_len;
alter table public.keepup_habits add constraint keepup_habits_cue_len check (cue is null or char_length(cue) <= 60);

-- Reminders: same as before, but nothing for a habit skipped today (a check-in with count 0).
-- (Only if the reminders update, setup 4, is already in. Otherwise setup 4 brings its own copy.)
do $do$ begin
  if to_regclass('public.keepup_push_sent') is not null then
    execute $fn$
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
      and (to_jsonb(h)->>'end_date' is null or (to_jsonb(h)->>'end_date')::date >= pp.d)  -- end_date may not exist yet
      and (h.schedule_type <> 'weekdays' or extract(isodow from pp.d)::smallint = any (h.schedule_days))
      and not exists (select 1 from keepup_checkins c where c.habit_id = h.id and c.date = pp.d and (c.count = 0 or c.count >= h.target_count))
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
$fn$;
  end if;
end $do$;
