-- Habits can belong to a part of the day (Today groups them) and carry an "After…" cue,
-- like "After my morning coffee". Both are optional.
alter table public.keepup_habits add column if not exists time_of_day text;
alter table public.keepup_habits add column if not exists cue text;
alter table public.keepup_habits drop constraint if exists keepup_habits_time_of_day_ok;
alter table public.keepup_habits add constraint keepup_habits_time_of_day_ok check (time_of_day is null or time_of_day in ('morning', 'afternoon', 'evening'));
alter table public.keepup_habits drop constraint if exists keepup_habits_cue_len;
alter table public.keepup_habits add constraint keepup_habits_cue_len check (cue is null or char_length(cue) <= 60);
