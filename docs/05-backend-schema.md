# 5. Backend schema

Supabase Postgres. Everything lives in its own schema **`habits`** so it can share your
existing free Supabase project with JobDone without mixing data. (`habits` gets added to
the project's "exposed schemas" setting; RLS is on for every table.)

Changes from the draft in the prompt are marked **(new)** or **(changed)**.

## Tables

### profiles
| column | type | notes |
|---|---|---|
| id | uuid PK | = `auth.users.id`, cascade delete |
| display_name | text | 1–40 chars |
| timezone | text | IANA name, e.g. `Europe/London` |
| week_start | smallint | 1 = Monday, 7 = Sunday |
| theme | text | |
| sounds_on, haptics_on | bool | **(new)** |
| evening_reminder_at | time null | **(new)** null = off |
| age_confirmed_at | timestamptz | **(new)** when the 13+ gate passed |
| created_at | timestamptz | |

### habits (table name `habit`, to avoid clashing with the schema name)
| column | type | notes |
|---|---|---|
| id | uuid PK | made on the phone (offline-safe) |
| user_id | uuid → profiles | |
| name | text | 1–60 chars |
| icon | text | emoji, or Pro custom icon key |
| colour | text | one of the palette keys |
| kind | enum `yes_no` / `count` | |
| target_count | int | 1 for yes/no, 1–100 for count |
| schedule_type | enum `daily` / `weekdays` / `x_per_week` | |
| schedule_days | smallint[] | ISO weekdays, for `weekdays` |
| times_per_week | smallint | 1–7, for `x_per_week` |
| reminder_time | time null | |
| sort_order | int | |
| archived_at | timestamptz null | never set automatically |
| created_at, updated_at | timestamptz | |

### checkins
| column | type | notes |
|---|---|---|
| id | uuid PK | made on the phone |
| habit_id | uuid → habit, cascade | |
| user_id | uuid → profiles | |
| date | date | the user's **local** date |
| count | int | 0–1000 |
| note | text null | Pro, ≤ 500 chars |
| created_at, updated_at | timestamptz | |

Unique (habit_id, date). A trigger rejects dates older than 7 days before the user's local
today, or more than 1 day ahead (allows timezone slack).

### streak_freezes **(changed: a record, not a store)**
Freezes are worked out by the streak function, not "spent" by the client. This table
records which days got frozen so the calendar can show ❄️ and results stay stable.
`(habit_id, date)` PK, user_id, created_at. Written only by the server function.

### squads
id, name (1–40), owner_id, invite_code (unique, 22 random URL-safe chars ≈ 128 bits),
max_members (5, or 15 when the owner is Pro; checked server-side), created_at.

### squad_members
(squad_id, user_id) PK, role `owner` / `member`, joined_at.

### squad_shared_habits
(squad_id, habit_id) PK. Habit must belong to a member of that squad.

### squad_streaks **(new)**
squad_id PK, current, longest, last_counted_date. Updated by the daily server job.

### nudges
id, squad_id, from_user, to_user, date. Unique (from_user, to_user, date).

### badges_earned
(user_id, badge_key) PK, earned_at.

### subscriptions
user_id, platform `play` / `app_store`, product_id, status `active` / `grace` /
`expired` / `refunded`, expires_at (null for lifetime), original_transaction_id (unique),
verified_at, raw_event jsonb. **Server only.**

### push_tokens **(changed from push_subscriptions)**
id, user_id, kind `fcm` / `apns` / `webpush`, token or endpoint, keys jsonb (web push),
device_label, created_at, last_seen_at. Unique token.

### feedback **(new)**, security_events **(new)**
Feedback: user_id, message (≤ 2000), created_at. Security events: user_id null, kind,
ip_hash, created_at. Server only; no passwords or tokens ever stored.

## Relations

```
profiles 1─* habit 1─* checkins
profiles 1─* squad_members *─1 squads 1─1 squad_streaks
squads 1─* squad_shared_habits *─1 habit
squads 1─* nudges
profiles 1─* badges_earned, subscriptions, push_tokens
```

## Row-level security

Helper (security definer): `habits.is_squadmate(other uuid)` and
`habits.habit_shared_with_me(habit_id uuid)`: true if the habit is in
`squad_shared_habits` for a squad I'm a member of.

| table | select | insert/update/delete |
|---|---|---|
| profiles | own row; squadmates can read **only** `display_name` via a view `squadmate_profiles` | own row |
| habit | own; or `habit_shared_with_me(id)` (via view showing only id, name, icon, colour, schedule) | own |
| checkins | own; or habit shared with me (view hides `note`) | own, date rule above |
| streak_freezes | own; or habit shared with me | none (server) |
| squads | members only | via RPC only |
| squad_members | members of the same squad | via RPC only (join, leave, remove) |
| squad_shared_habits | members of that squad | own habits, own squads |
| squad_streaks | members | none (server) |
| nudges | sender or receiver | via RPC only (checks same squad + 1/day) |
| badges_earned | own | none (server) |
| subscriptions | own | **none** (webhook with service role) |
| push_tokens | own | own |
| feedback | none | insert own |
| security_events | none | none |

## Server functions (RPC / Edge Functions)

- `create_squad(name)`: makes squad + owner row + random code. Free users: max 1 squad.
- `join_squad(code)`: locks the squad row, counts members, rejects if full or already a
  member. Rate-limited (10 tries/hour per user) so codes can't be guessed.
- `leave_squad`, `remove_member` (owner), `send_nudge(to_user)` → push.
- `is_pro()`: reads `subscriptions`.
- `delete_my_account()`: Edge Function, deletes auth user → cascades everything.
- `export_my_data()`: JSON of all own rows.
- Webhook `billing-webhook`: verifies signature, upserts `subscriptions`.
- Cron (pg_cron): squad streak roll-over, "about to break" pushes, badge checks.

## Auth flow

1. Sign up: Turnstile check → Supabase `signUp` (email + password, min 8 chars, checked
   against leaked passwords) → confirm email → age gate → profile row created by trigger.
2. Google / Apple: native sign-in on phones → `signInWithIdToken`; web uses redirect.
3. Sign in rate limit: Supabase built-in limits plus an Edge Function guard (5 tries / 15
   min per email+IP, then 15 min lock), logged to `security_events`.
4. Reset: same response whether or not the email exists; link valid once, 1 hour; after
   change, other sessions signed out.
5. Sessions: short access tokens (1 hour) with refresh; on web, stored securely; on phones,
   in Capacitor Preferences (Keychain/Keystore-backed plugin if available).
