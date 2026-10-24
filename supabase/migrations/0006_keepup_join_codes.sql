-- Short squad codes people can type (like KX7P M2QD), because invite links open in the browser,
-- and the home-screen app keeps its own separate sign-in. 8 characters from 32 (no I, O, 0 or 1),
-- so they're easy to read out and can't be guessed (joining is also limited to 10 tries an hour).
create or replace function public.keepup_new_code() returns text language sql volatile set search_path = public as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(x.b, i) % 32), 1), '' order by i)
  from (select extensions.gen_random_bytes(8) as b) x, generate_series(0, 7) i
$$;
alter table public.keepup_squads add column if not exists join_code text unique default public.keepup_new_code();

-- Accepts the code with or without spaces or dashes, any case.
create or replace function public.keepup_norm_code(code text) returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

create or replace function public.keepup_join_squad(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare sq keepup_squads; uid uuid := auth.uid(); n int; cap int; tries int;
begin
  if uid is null then raise exception 'Sign in first'; end if;
  -- 10 wrong or right codes an hour per person, so codes can't be guessed.
  select count(*) into tries from keepup_security_events where user_id = uid and kind = 'join_try' and created_at > now() - interval '1 hour';
  if tries >= 10 then raise exception 'Too many tries. Wait an hour and try again.'; end if;
  insert into keepup_security_events (user_id, kind) values (uid, 'join_try');
  select * into sq from keepup_squads where invite_code = code or join_code = keepup_norm_code(code) limit 1 for update;
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

create or replace function public.keepup_invite_preview(code text) returns table (name text, members int, full_squad boolean)
language sql stable security definer set search_path = public as $$
  select s.name, count(m.*)::int, count(m.*) >= case when keepup_is_pro(s.owner_id) then 15 else 5 end
  from keepup_squads s left join keepup_squad_members m on m.squad_id = s.id
  where s.invite_code = code or s.join_code = keepup_norm_code(code) group by s.id
$$;
revoke all on function public.keepup_new_code() from public, anon, authenticated;
