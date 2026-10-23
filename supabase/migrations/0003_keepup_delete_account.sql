-- Delete my account, from inside the app (both app stores require this).
-- Squads I own pass to the next member first, so deleting doesn't break my friends' squad.
-- Then the login itself is removed; every keepup_* row goes with it (on delete cascade).
create or replace function public.keepup_delete_account() returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s uuid;
begin
  if uid is null then raise exception 'Not signed in.'; end if;
  for s in select squad_id from keepup_squad_members where user_id = uid loop
    perform keepup_leave_squad(s);
  end loop;
  delete from keepup_profiles where id = uid;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.keepup_delete_account() from public, anon;
grant execute on function public.keepup_delete_account() to authenticated;
