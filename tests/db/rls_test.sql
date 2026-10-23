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
