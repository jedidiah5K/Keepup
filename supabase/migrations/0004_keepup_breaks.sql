-- Breaks (holiday, sick days): streaks are paused between start_date and end_date.
-- A break can only start today or later (with a day's slack for time zones) and lasts up to 30 days,
-- so nobody can go back and paper over a missed week.
create table if not exists public.keepup_breaks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.keepup_profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date - 1 and end_date - start_date < 30)
);
create index if not exists keepup_breaks_user on public.keepup_breaks (user_id);
alter table public.keepup_breaks enable row level security;

drop policy if exists "own breaks read" on public.keepup_breaks;
create policy "own breaks read" on public.keepup_breaks for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own breaks add" on public.keepup_breaks;
create policy "own breaks add" on public.keepup_breaks for insert to authenticated
  with check (user_id = (select auth.uid()) and start_date >= current_date - 1);
drop policy if exists "own breaks change" on public.keepup_breaks;
create policy "own breaks change" on public.keepup_breaks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own breaks remove" on public.keepup_breaks;
create policy "own breaks remove" on public.keepup_breaks for delete to authenticated using (user_id = (select auth.uid()));

-- Changing a break may only end it sooner, never move or stretch it.
create or replace function public.keepup_break_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.start_date <> old.start_date or new.end_date > old.end_date or new.user_id <> old.user_id then
    raise exception 'A break can only be ended early.';
  end if;
  return new;
end $$;
drop trigger if exists keepup_break_guard on public.keepup_breaks;
create trigger keepup_break_guard before update on public.keepup_breaks for each row execute function public.keepup_break_guard();

grant select, insert, update, delete on public.keepup_breaks to authenticated;
