-- Run after the stub and the migrations. Any failed check raises and stops the script.
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a', 'a@x'), ('00000000-0000-0000-0000-00000000000b', 'b@x'),
 ('00000000-0000-0000-0000-00000000000c', 'c@x'), ('00000000-0000-0000-0000-00000000000d', 'd@x'),
 ('00000000-0000-0000-0000-00000000000e', 'e@x'), ('00000000-0000-0000-0000-00000000000f', 'f@x');

create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000' || u, false) $$;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$ begin if not ok then raise exception 'FAILED: %', what; end if; raise notice 'ok: %', what; end $$;
create function pg_temp.fails(q text, what text) returns void language plpgsql as $$
begin begin execute q; exception when others then raise notice 'ok: % (%)', what, sqlerrm; return; end; raise exception 'FAILED (should have been refused): %', what; end $$;

set role authenticated;

-- each person makes a profile and a habit
do $$ declare u text; begin
  foreach u in array array['a','b','c','d','e','f'] loop
    perform pg_temp.as_user(u);
    insert into keepup_profiles (id, display_name) values (auth.uid(), 'User ' || u);
    insert into keepup_habits (id, name) values (('10000000-0000-0000-0000-00000000000' || u)::uuid, 'Habit ' || u);
    insert into keepup_habits (id, name) values (('20000000-0000-0000-0000-00000000000' || u)::uuid, 'Secret ' || u);
    insert into keepup_checkins (habit_id, date) values (('10000000-0000-0000-0000-00000000000' || u)::uuid, current_date);
    insert into keepup_checkins (habit_id, date, note) values (('20000000-0000-0000-0000-00000000000' || u)::uuid, current_date, 'private note');
  end loop; end $$;

select pg_temp.as_user('a');
select pg_temp.check((select count(*) from keepup_habits) = 2, 'A sees only own habits');
select pg_temp.check((select count(*) from keepup_checkins) = 2, 'A sees only own check-ins');
select pg_temp.check((select count(*) from keepup_profiles) = 1, 'A sees only own profile');
select pg_temp.fails($$insert into keepup_habits (user_id, name) values ('00000000-0000-0000-0000-00000000000b', 'x')$$, 'A cannot add a habit for B');
select pg_temp.fails($$insert into keepup_checkins (habit_id, date) values ('10000000-0000-0000-0000-00000000000b', current_date)$$, 'A cannot tick B''s habit');
select pg_temp.fails($$insert into keepup_checkins (habit_id, date) values ('10000000-0000-0000-0000-00000000000a', current_date - 9)$$, 'no check-ins older than 7 days');
select pg_temp.fails($$insert into keepup_subscriptions (user_id, platform, product_id, status, original_transaction_id) values (auth.uid(), 'play', 'pro_lifetime', 'active', 'x')$$, 'client cannot grant itself Pro');
select pg_temp.fails($$insert into keepup_badges_earned (user_id, badge_key) values (auth.uid(), 'x')$$, 'client cannot award badges');
select pg_temp.fails($$insert into keepup_squads (name, owner_id) values ('x', auth.uid())$$, 'squads only via create_squad');

-- A makes a squad, shares one habit
select keepup_create_squad('Gym Rats') as sq \gset
insert into keepup_squad_shared_habits values (:'sq', '10000000-0000-0000-0000-00000000000a');
select pg_temp.fails($$select keepup_create_squad('Second')$$, 'free account: only 1 squad');
select invite_code as code from keepup_squads where id = :'sq' \gset
select pg_temp.check(length(:'code') = 22, 'invite code is 22 random characters');

-- B joins, shares one habit; cannot share A's habit
select pg_temp.as_user('b');
select pg_temp.check((select members from keepup_invite_preview(:'code')) = 1, 'invite preview shows member count');
select pg_temp.check(keepup_join_squad(:'code') = :'sq', 'B joins with the link');
insert into keepup_squad_shared_habits values (:'sq', '10000000-0000-0000-0000-00000000000b');
select pg_temp.fails(format($$insert into keepup_squad_shared_habits values (%L, '20000000-0000-0000-0000-00000000000a')$$, :'sq'), 'B cannot share A''s habit');
select pg_temp.check((select count(*) from keepup_habits) = 2, 'B still sees only own habit rows');
select pg_temp.check((select count(distinct habit_id) from keepup_squad_board(:'sq', current_date - 7) where habit_id is not null) = 2, 'squad board shows the 2 shared habits');
select pg_temp.check(not exists (select 1 from keepup_squad_board(:'sq', current_date - 7) where habit_name like 'Secret%'), 'unshared habits never appear on the board');

-- nudges: once per friend per day, only squadmates
select keepup_nudge(:'sq', '00000000-0000-0000-0000-00000000000a', current_date);
select pg_temp.fails(format($$select keepup_nudge(%L, '00000000-0000-0000-0000-00000000000a', current_date)$$, :'sq'), 'second nudge same day refused');

-- outsider F can't read the squad or its board
select pg_temp.as_user('f');
select pg_temp.check((select count(*) from keepup_squads) = 0, 'outsider cannot see the squad');
select pg_temp.check((select count(*) from keepup_squad_board(:'sq', current_date - 7)) = 0, 'outsider gets an empty board');
select pg_temp.fails(format($$select keepup_nudge(%L, '00000000-0000-0000-0000-00000000000a', current_date)$$, :'sq'), 'outsider cannot nudge');
select pg_temp.fails(format($$select keepup_remove_member(%L, '00000000-0000-0000-0000-00000000000b')$$, :'sq'), 'non-owner cannot remove members');

-- fill to 5, 6th is refused
select pg_temp.as_user('c'); select keepup_join_squad(:'code');
select pg_temp.as_user('d'); select keepup_join_squad(:'code');
select pg_temp.as_user('e'); select keepup_join_squad(:'code');
select pg_temp.as_user('f');
select pg_temp.fails(format($$select keepup_join_squad(%L)$$, :'code'), '6th member refused on a free squad');
select pg_temp.check(keepup_join_squad('wrong-code-wrong-code1') is null, 'wrong code gives nothing');
select keepup_join_squad('wrong-code-wrong-code' || n) from generate_series(2, 10) n;
select pg_temp.fails($$select keepup_join_squad('wrong-code-wrong-code11')$$, 'guessing codes is rate-limited (10 an hour)');

-- owner removes B; B's shared habit leaves the squad with them
select pg_temp.as_user('a');
select keepup_remove_member(:'sq', '00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from keepup_squad_members where squad_id = :'sq') = 4, 'owner removed a member');
select pg_temp.check((select count(*) from keepup_squad_shared_habits where squad_id = :'sq') = 1, 'removed member''s habits are unshared');

-- owner leaves: ownership passes on
select keepup_leave_squad(:'sq');
select pg_temp.as_user('c');
select pg_temp.check((select owner_id from keepup_squads where id = :'sq') = '00000000-0000-0000-0000-00000000000c', 'ownership passes to the longest member');

-- signed-out visitor
reset role; set role anon;
select pg_temp.check((select count(*) from keepup_habits) = 0 and (select count(*) from keepup_squads) = 0, 'signed-out visitor reads nothing');
select pg_temp.fails($$select keepup_create_squad('x')$$, 'signed-out visitor cannot make squads');

-- import: first sign-in uploads a phone's older history, only for yourself
reset role; set role authenticated;
select pg_temp.as_user('a');
select pg_temp.check(keepup_import(
  '[{"id":"10000000-0000-0000-0000-0000000000a1","name":"Old habit","schedule_type":"daily","updated_at":"2026-01-01T00:00:00Z"}]',
  format('[{"habit_id":"10000000-0000-0000-0000-0000000000a1","date":"%s","count":1},{"habit_id":"10000000-0000-0000-0000-0000000000a1","date":"%s","count":1}]', current_date - 60, current_date)::jsonb
) = 2, 'import adds old and new days');
select pg_temp.check((select count(*) from keepup_checkins where habit_id = '10000000-0000-0000-0000-0000000000a1') = 2, 'imported days are saved');
select keepup_import('[]', format('[{"habit_id":"10000000-0000-0000-0000-0000000000a1","date":"%s","count":5}]', current_date - 60)::jsonb);
select pg_temp.check((select count from keepup_checkins where habit_id = '10000000-0000-0000-0000-0000000000a1' and date = current_date - 60) = 1, 'import never changes an old day already saved');
select pg_temp.fails(format($$insert into keepup_checkins (habit_id, date) values ('10000000-0000-0000-0000-0000000000a1', %L)$$, current_date - 30), 'normal writes still limited to the last 7 days');
select pg_temp.as_user('c');
select keepup_import('[{"id":"10000000-0000-0000-0000-0000000000a1","name":"Hijack","updated_at":"2030-01-01T00:00:00Z"}]',
  format('[{"habit_id":"10000000-0000-0000-0000-0000000000a1","date":"%s","count":1}]', current_date - 20)::jsonb);
select pg_temp.as_user('a');
select pg_temp.check((select name from keepup_habits where id = '10000000-0000-0000-0000-0000000000a1') = 'Old habit'
  and (select count(*) from keepup_checkins where habit_id = '10000000-0000-0000-0000-0000000000a1') = 2, 'import cannot touch someone else''s habit');
reset role; set role anon;
select pg_temp.fails($$select keepup_import('[]', '[]')$$, 'signed-out visitor cannot import');

-- breaks: only from today on, at most 30 days, only ever ended early
reset role; set role authenticated;
select pg_temp.as_user('a');
insert into keepup_breaks (id, start_date, end_date) values ('20000000-0000-0000-0000-0000000000b1', current_date, current_date + 6);
select pg_temp.check((select count(*) from keepup_breaks) = 1, 'a break can start today');
select pg_temp.fails(format($$insert into keepup_breaks (id, start_date, end_date) values (gen_random_uuid(), %L, %L)$$, current_date - 10, current_date), 'a break cannot start in the past');
select pg_temp.fails(format($$insert into keepup_breaks (id, start_date, end_date) values (gen_random_uuid(), %L, %L)$$, current_date, current_date + 40), 'a break lasts at most 30 days');
select pg_temp.fails(format($$update keepup_breaks set end_date = %L where id = '20000000-0000-0000-0000-0000000000b1'$$, current_date + 20), 'a break cannot be stretched');
update keepup_breaks set end_date = current_date + 2 where id = '20000000-0000-0000-0000-0000000000b1';
select pg_temp.check((select end_date from keepup_breaks where id = '20000000-0000-0000-0000-0000000000b1') = current_date + 2, 'a break can end early');
select pg_temp.as_user('c');
select pg_temp.check((select count(*) from keepup_breaks) = 0, 'others cannot see my breaks');

-- delete account: everything goes, squads pass on
select pg_temp.as_user('c');
select keepup_delete_account();
reset role;
select pg_temp.check(not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000c')
  and not exists (select 1 from keepup_profiles where id = '00000000-0000-0000-0000-00000000000c'), 'delete account removes the login and profile');
select pg_temp.check((select count(*) from keepup_squads where id = :'sq') = 1, 'a squad survives its owner deleting their account when others remain');
set role anon;
select pg_temp.fails($$select keepup_delete_account()$$, 'signed-out visitor cannot delete accounts');
