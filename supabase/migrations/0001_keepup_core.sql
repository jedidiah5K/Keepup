-- KeepUp core tables. Lives in Job's second free Supabase project (ref xgmwqpasogwlvtjaapwo),
-- not JobDone's live one, so KeepUp has its own accounts. Every table is prefixed keepup_ and has
-- row-level security on, so other apps in the same project never see KeepUp data.

-- ---------- profiles ----------
create table if not exists public.keepup_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  timezone text not null default 'UTC' check (char_length(timezone) <= 64),
  week_start smallint not null default 1 check (week_start in (1, 7)),
  theme text not null default 'paper' check (char_length(theme) <= 20),
  sounds_on boolean not null default true,
  haptics_on boolean not null default true,
  evening_reminder_at time,
  age_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- habits ----------
create table if not exists public.keepup_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.keepup_profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  icon text not null default '✅' check (char_length(icon) <= 32),
  colour text not null default 'tangerine' check (char_length(colour) <= 20),
  kind text not null default 'yes_no' check (kind in ('yes_no', 'count')),
  target_count int not null default 1 check (target_count between 1 and 100),
  schedule_type text not null default 'daily' check (schedule_type in ('daily', 'weekdays', 'x_per_week')),
  schedule_days smallint[] not null default '{}' check (schedule_days <@ array[1,2,3,4,5,6,7]::smallint[]),
  times_per_week smallint check (times_per_week between 1 and 7),
  reminder_time time,
  sort_order int not null default 0,
  start_date date not null default current_date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (schedule_type <> 'weekdays' or cardinality(schedule_days) > 0),
  check (schedule_type <> 'x_per_week' or times_per_week is not null)
);
create index if not exists keepup_habits_user on public.keepup_habits (user_id, sort_order);

-- ---------- check-ins ----------
create table if not exists public.keepup_checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.keepup_habits (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.keepup_profiles (id) on delete cascade,
  date date not null,
  count int not null default 1 check (count between 0 and 1000),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, date)
);
create index if not exists keepup_checkins_user_date on public.keepup_checkins (user_id, date);

-- Only the last 7 days can be changed (dates are the person's local date, so allow a day of slack
-- each way for timezones). The habit must belong to the same person.
create or replace function public.keepup_checkin_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.date < current_date - 8 or new.date > current_date + 1 then raise exception 'Only the last 7 days can be changed'; end if;
  if tg_op = 'UPDATE' and old.date <> new.date then raise exception 'Date cannot change'; end if;
  if not exists (select 1 from keepup_habits h where h.id = new.habit_id and h.user_id = new.user_id) then raise exception 'Not your habit'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists keepup_checkin_guard on public.keepup_checkins;
create trigger keepup_checkin_guard before insert or update on public.keepup_checkins
  for each row execute function public.keepup_checkin_guard();

-- Days a streak freeze saved (written by the server streak job, shown as ❄️).
create table if not exists public.keepup_streak_freezes (
  habit_id uuid not null references public.keepup_habits (id) on delete cascade,
  date date not null,
  user_id uuid not null references public.keepup_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (habit_id, date)
);

-- ---------- squads ----------
create table if not exists public.keepup_squads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  owner_id uuid not null references public.keepup_profiles (id) on delete cascade,
  -- 16 random bytes, URL-safe: about 128 bits, not guessable.
  invite_code text not null unique default translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_'),
  created_at timestamptz not null default now()
);
create table if not exists public.keepup_squad_members (
  squad_id uuid not null references public.keepup_squads (id) on delete cascade,
  user_id uuid not null references public.keepup_profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);
create index if not exists keepup_squad_members_user on public.keepup_squad_members (user_id);
create table if not exists public.keepup_squad_shared_habits (
  squad_id uuid not null references public.keepup_squads (id) on delete cascade,
  habit_id uuid not null references public.keepup_habits (id) on delete cascade,
  primary key (squad_id, habit_id)
);
create index if not exists keepup_shared_habit on public.keepup_squad_shared_habits (habit_id);
create table if not exists public.keepup_squad_streaks (
  squad_id uuid primary key references public.keepup_squads (id) on delete cascade,
  current int not null default 0,
  longest int not null default 0,
  last_counted_date date
);
create table if not exists public.keepup_nudges (
  id bigint generated always as identity primary key,
  squad_id uuid not null references public.keepup_squads (id) on delete cascade,
  from_user uuid not null references public.keepup_profiles (id) on delete cascade,
  to_user uuid not null references public.keepup_profiles (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (from_user, to_user, date)
);

-- ---------- badges, billing, push, feedback, security log ----------
create table if not exists public.keepup_badges_earned (
  user_id uuid not null references public.keepup_profiles (id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);
create table if not exists public.keepup_subscriptions (
  user_id uuid not null references public.keepup_profiles (id) on delete cascade,
  platform text not null check (platform in ('play', 'app_store')),
  product_id text not null,
  status text not null check (status in ('active', 'grace', 'expired', 'refunded')),
  expires_at timestamptz,              -- null = lifetime
  original_transaction_id text primary key,
  verified_at timestamptz not null default now(),
  raw_event jsonb
);
create index if not exists keepup_subscriptions_user on public.keepup_subscriptions (user_id);
create table if not exists public.keepup_push_tokens (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.keepup_profiles (id) on delete cascade,
  kind text not null check (kind in ('fcm', 'apns', 'webpush')),
  token text not null unique check (char_length(token) <= 1000),
  keys jsonb,
  device_label text check (char_length(device_label) <= 60),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create table if not exists public.keepup_feedback (
  id bigint generated always as identity primary key,
  user_id uuid references public.keepup_profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table if not exists public.keepup_security_events (
  id bigint generated always as identity primary key,
  user_id uuid,
  kind text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists keepup_security_events_ip on public.keepup_security_events (kind, ip_hash, created_at);

-- ---------- helpers (security definer so policies don't loop) ----------
create or replace function public.keepup_my_squads() returns setof uuid language sql stable security definer set search_path = public as $$
  select squad_id from keepup_squad_members where user_id = auth.uid()
$$;
create or replace function public.keepup_habit_shared_with_me(h uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from keepup_squad_shared_habits s
                 join keepup_squad_members m on m.squad_id = s.squad_id
                 where s.habit_id = h and m.user_id = auth.uid())
$$;
create or replace function public.keepup_is_squadmate(other uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from keepup_squad_members a join keepup_squad_members b on a.squad_id = b.squad_id
                 where a.user_id = auth.uid() and b.user_id = other)
$$;
create or replace function public.keepup_is_pro(u uuid default auth.uid()) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from keepup_subscriptions where user_id = u and status in ('active', 'grace')
                 and (expires_at is null or expires_at > now()))
$$;

-- ---------- row-level security ----------
alter table public.keepup_profiles enable row level security;
alter table public.keepup_habits enable row level security;
alter table public.keepup_checkins enable row level security;
alter table public.keepup_streak_freezes enable row level security;
alter table public.keepup_squads enable row level security;
alter table public.keepup_squad_members enable row level security;
alter table public.keepup_squad_shared_habits enable row level security;
alter table public.keepup_squad_streaks enable row level security;
alter table public.keepup_nudges enable row level security;
alter table public.keepup_badges_earned enable row level security;
alter table public.keepup_subscriptions enable row level security;
alter table public.keepup_push_tokens enable row level security;
alter table public.keepup_feedback enable row level security;
alter table public.keepup_security_events enable row level security;

-- Own profile only. Squadmates get display names through keepup_squadmates() below, never the row.
drop policy if exists "own profile" on public.keepup_profiles;
create policy "own profile" on public.keepup_profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "own habits" on public.keepup_habits;
create policy "own habits" on public.keepup_habits for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own checkins" on public.keepup_checkins;
create policy "own checkins" on public.keepup_checkins for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "add own checkins" on public.keepup_checkins;
create policy "add own checkins" on public.keepup_checkins for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "change own checkins" on public.keepup_checkins;
create policy "change own checkins" on public.keepup_checkins for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Unticking is limited to the last 7 days too. (Deleting a whole habit still removes all its
-- check-ins: foreign-key cascades are not subject to these rules.)
drop policy if exists "untick recent checkins" on public.keepup_checkins;
create policy "untick recent checkins" on public.keepup_checkins for delete to authenticated
  using (user_id = (select auth.uid()) and date >= current_date - 8);
drop policy if exists "own and shared freezes" on public.keepup_streak_freezes;
create policy "own and shared freezes" on public.keepup_streak_freezes for select to authenticated
  using (user_id = (select auth.uid()) or public.keepup_habit_shared_with_me(habit_id));

drop policy if exists "members read squad" on public.keepup_squads;
create policy "members read squad" on public.keepup_squads for select to authenticated
  using (id in (select public.keepup_my_squads()));
drop policy if exists "members read members" on public.keepup_squad_members;
create policy "members read members" on public.keepup_squad_members for select to authenticated
  using (squad_id in (select public.keepup_my_squads()));
drop policy if exists "members read shared" on public.keepup_squad_shared_habits;
create policy "members read shared" on public.keepup_squad_shared_habits for select to authenticated
  using (squad_id in (select public.keepup_my_squads()));
drop policy if exists "share own habits" on public.keepup_squad_shared_habits;
create policy "share own habits" on public.keepup_squad_shared_habits for insert to authenticated
  with check (squad_id in (select public.keepup_my_squads())
              and exists (select 1 from public.keepup_habits h where h.id = habit_id and h.user_id = (select auth.uid())));
drop policy if exists "unshare own habits" on public.keepup_squad_shared_habits;
create policy "unshare own habits" on public.keepup_squad_shared_habits for delete to authenticated
  using (exists (select 1 from public.keepup_habits h where h.id = habit_id and h.user_id = (select auth.uid())));
drop policy if exists "members read squad streak" on public.keepup_squad_streaks;
create policy "members read squad streak" on public.keepup_squad_streaks for select to authenticated
  using (squad_id in (select public.keepup_my_squads()));
drop policy if exists "see own nudges" on public.keepup_nudges;
create policy "see own nudges" on public.keepup_nudges for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));
drop policy if exists "own badges" on public.keepup_badges_earned;
create policy "own badges" on public.keepup_badges_earned for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "own subscription" on public.keepup_subscriptions;
create policy "own subscription" on public.keepup_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "own push tokens" on public.keepup_push_tokens;
create policy "own push tokens" on public.keepup_push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "send feedback" on public.keepup_feedback;
create policy "send feedback" on public.keepup_feedback for insert to authenticated
  with check (user_id = (select auth.uid()));
-- keepup_security_events: no policies (server only).
-- Nobody but the server writes subscriptions, badges, squad streaks or freezes.
revoke insert, update, delete on public.keepup_subscriptions, public.keepup_badges_earned,
  public.keepup_squad_streaks, public.keepup_streak_freezes, public.keepup_security_events from anon, authenticated;

-- ---------- what squadmates may see (only shared habits, no notes) ----------
create or replace function public.keepup_squad_board(sq uuid, since date)
returns table (user_id uuid, display_name text, habit_id uuid, habit_name text, icon text, colour text,
               kind text, target_count int, schedule_type text, schedule_days smallint[], times_per_week smallint,
               start_date date, date date, count int)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, h.id, h.name, h.icon, h.colour, h.kind, h.target_count, h.schedule_type,
         h.schedule_days, h.times_per_week, h.start_date, c.date, c.count
  from keepup_squad_members m
  join keepup_profiles p on p.id = m.user_id
  left join keepup_squad_shared_habits s on s.squad_id = m.squad_id
  left join keepup_habits h on h.id = s.habit_id and h.user_id = m.user_id and h.archived_at is null
  left join keepup_checkins c on c.habit_id = h.id and c.date >= since
  where m.squad_id = sq and sq in (select keepup_my_squads())
$$;

-- ---------- squad actions (all size and permission checks happen here, on the server) ----------
create or replace function public.keepup_create_squad(squad_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first'; end if;
  if not keepup_is_pro(uid) and exists (select 1 from keepup_squad_members where user_id = uid) then
    raise exception 'Free accounts can be in 1 squad. Leave your squad first, or get Pro for more.';
  end if;
  insert into keepup_squads (name, owner_id) values (btrim(squad_name), uid) returning id into sid;
  insert into keepup_squad_members (squad_id, user_id, role) values (sid, uid, 'owner');
  insert into keepup_squad_streaks (squad_id) values (sid);
  return sid;
end $$;

create or replace function public.keepup_join_squad(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare sq keepup_squads; uid uuid := auth.uid(); n int; cap int; tries int;
begin
  if uid is null then raise exception 'Sign in first'; end if;
  -- 10 wrong or right codes an hour per person, so codes can't be guessed.
  select count(*) into tries from keepup_security_events where user_id = uid and kind = 'join_try' and created_at > now() - interval '1 hour';
  if tries >= 10 then raise exception 'Too many tries. Wait an hour and try again.'; end if;
  insert into keepup_security_events (user_id, kind) values (uid, 'join_try');
  select * into sq from keepup_squads where invite_code = code for update;
  -- A wrong code returns null instead of raising, so the try above is kept and counts.
  if not found then return null; end if;
  if exists (select 1 from keepup_squad_members where squad_id = sq.id and user_id = uid) then return sq.id; end if;
  if not keepup_is_pro(uid) and exists (select 1 from keepup_squad_members where user_id = uid) then
    raise exception 'Free accounts can be in 1 squad. Leave your squad first, or get Pro for more.';
  end if;
  cap := case when keepup_is_pro(sq.owner_id) then 15 else 5 end;
  select count(*) into n from keepup_squad_members where squad_id = sq.id;
  if n >= cap then raise exception 'This squad is full.'; end if;
  insert into keepup_squad_members (squad_id, user_id) values (sq.id, uid);
  return sq.id;
end $$;

create or replace function public.keepup_leave_squad(sq uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); next_owner uuid;
begin
  delete from keepup_squad_shared_habits s using keepup_habits h where s.squad_id = sq and h.id = s.habit_id and h.user_id = uid;
  delete from keepup_squad_members where squad_id = sq and user_id = uid;
  if exists (select 1 from keepup_squads where id = sq and owner_id = uid) then
    select user_id into next_owner from keepup_squad_members where squad_id = sq order by joined_at limit 1;
    if next_owner is null then delete from keepup_squads where id = sq;
    else update keepup_squads set owner_id = next_owner where id = sq;
         update keepup_squad_members set role = 'owner' where squad_id = sq and user_id = next_owner; end if;
  end if;
end $$;

create or replace function public.keepup_remove_member(sq uuid, member uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from keepup_squads where id = sq and owner_id = auth.uid()) then raise exception 'Only the squad owner can remove people.'; end if;
  if member = auth.uid() then raise exception 'Use Leave squad instead.'; end if;
  delete from keepup_squad_shared_habits s using keepup_habits h where s.squad_id = sq and h.id = s.habit_id and h.user_id = member;
  delete from keepup_squad_members where squad_id = sq and user_id = member;
end $$;

create or replace function public.keepup_rename_squad(sq uuid, new_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update keepup_squads set name = btrim(new_name) where id = sq and owner_id = auth.uid();
  if not found then raise exception 'Only the squad owner can rename it.'; end if;
end $$;

-- Records a nudge (1 per friend per day). The push itself is sent by the "notify" Edge Function.
create or replace function public.keepup_nudge(sq uuid, friend uuid, local_day date) returns void
language plpgsql security definer set search_path = public as $$
begin
  if friend = auth.uid() then raise exception 'You cannot nudge yourself.'; end if;
  if not exists (select 1 from keepup_squad_members a join keepup_squad_members b on a.squad_id = b.squad_id
                 where a.squad_id = sq and a.user_id = auth.uid() and b.user_id = friend) then raise exception 'Not in this squad.'; end if;
  if abs(local_day - current_date) > 1 then raise exception 'Bad date'; end if;
  insert into keepup_nudges (squad_id, from_user, to_user, date) values (sq, auth.uid(), friend, local_day);
exception when unique_violation then raise exception 'You already nudged them today.';
end $$;

-- Squad invite preview (name and member count only) for someone who isn't a member yet.
create or replace function public.keepup_invite_preview(code text) returns table (name text, members int, full_squad boolean)
language sql stable security definer set search_path = public as $$
  select s.name, count(m.*)::int, count(m.*) >= case when keepup_is_pro(s.owner_id) then 15 else 5 end
  from keepup_squads s left join keepup_squad_members m on m.squad_id = s.id
  where s.invite_code = code group by s.id
$$;

-- No trigger on auth.users: other apps may share this project. The app creates the
-- keepup_profiles row itself at the end of sign-up (allowed by the "own profile" policy).

-- Lock down: the trigger function is never called directly, and signed-out visitors can only
-- preview an invite.
revoke execute on function public.keepup_checkin_guard() from public, anon, authenticated;
revoke execute on function public.keepup_my_squads(), public.keepup_habit_shared_with_me(uuid),
  public.keepup_is_squadmate(uuid), public.keepup_is_pro(uuid), public.keepup_squad_board(uuid, date),
  public.keepup_create_squad(text), public.keepup_join_squad(text), public.keepup_leave_squad(uuid),
  public.keepup_remove_member(uuid, uuid), public.keepup_rename_squad(uuid, text),
  public.keepup_nudge(uuid, uuid, date) from public, anon;
grant execute on function public.keepup_my_squads(), public.keepup_habit_shared_with_me(uuid),
  public.keepup_is_squadmate(uuid), public.keepup_is_pro(uuid), public.keepup_squad_board(uuid, date),
  public.keepup_create_squad(text), public.keepup_join_squad(text), public.keepup_leave_squad(uuid),
  public.keepup_remove_member(uuid, uuid), public.keepup_rename_squad(uuid, text),
  public.keepup_nudge(uuid, uuid, date) to authenticated;
