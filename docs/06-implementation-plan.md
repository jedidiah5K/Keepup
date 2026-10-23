# 6. Implementation plan

After every step: run it in a browser at phone size (and on a phone once the native shell
exists), click through, screenshot, and report what works and what doesn't before moving
on. Steps that touch money, publishing, or JobDone wait for Job's OK.

| # | Step | Done when (the check) |
|---|------|-----------------------|
| 1 | **Plan docs** (this folder) | Job approves the docs and picks a name |
| 2 | **Copy reusable parts from JobDone**: auth screens, theme system, share card renderer, streak/badge logic, intro flow, settings, sounds/haptics. JobDone itself is never changed. | Project builds; copied pieces render with placeholder data; screenshot of auth + theme picker |
| 3 | **Native shell early**: add Capacitor Android + iOS projects, app id, icons placeholder | App opens on an Android emulator and an iOS simulator/cloud build showing the web app |
| 4 | **Database + RLS + auth**: `habits` schema, tables, RLS, triggers, email/Google/Apple sign-in, Turnstile | SQL tests prove: user A can't read B's data; squadmate sees only shared habits; client can't write `subscriptions` |
| 5 | **Habits**: create, edit, reorder, archive, delete | Screenshots; data survives reload and offline → online |
| 6 | **Today + check-ins + streak logic**, offline-first | Unit tests pass for every streak rule below; tick feels right (sound, haptic, burst) |
| 7 | **Stats + heatmap** | Numbers match a hand-checked test account |
| 8 | **Notifications**: local reminders, evening reminder, FCM/APNs + web push setup, test button | Reminder fires on a real Android phone with the app closed and the phone offline; push arrives on iPhone (TestFlight) |
| 9 | **Squads**: create, invite link (deep link into app), join, shared habits, squad streak, nudges | Two test accounts in one squad on two devices; 6th member rejected; second nudge same day rejected |
| 10 | **Badges + share cards** | All 20–30 badges unlock in tests; cards export as images in each theme |
| 11 | **Onboarding** | New user finishes in under 60 seconds (timed) |
| 12 | **Pro + billing**: store products, RevenueCat, webhook, `is_pro()`, Pro screen, restore, manage | Test purchases (Play licence testers, Apple sandbox) unlock Pro only after webhook; refund/expiry turns extras off and keeps data |
| 13 | **Settings, export, delete account, privacy policy, terms** | Export opens in a spreadsheet; delete removes every row (checked in SQL) |
| 14 | **Security review + fixes** (owasp-security skill, secret scan, checklist in the prompt) | Every checklist item ticked with proof |
| 15 | **Store prep for both**: signing keys, Play listing + 12-tester closed test (14 days), TestFlight beta, App Store listing, privacy labels / Data safety form, age ratings, screenshots | Closed test running; TestFlight build approved for beta |
| 16 | **Launch on both stores the same day** (Job's go-ahead) | Live on Google Play and the App Store |

**Timing tip:** the Play closed test needs 14 days and Apple review can take a few days, so
step 15 starts as soon as step 12 works, and steps 13–14 happen during the test.

## Streak rules the tests must cover (step 6)

- Daily: a run of consecutive scheduled days done. Today not done yet doesn't break it.
- Weekday habits: unscheduled days are skipped, not misses.
- X per week: consecutive weeks hitting the target; the current week counts only once hit
  or still possible.
- Count habits: done means count ≥ target.
- Freeze: 1 per week (3 with Pro), used automatically on the first miss of that week;
  unused freezes don't carry over. For X-per-week, a freeze covers a week that ended
  1 short.
- Pro ends: freezes already used stay; future weeks get 1.
- Editing a past day (within 7 days) recalculates streaks and can "un-freeze" a day.
- Timezones: travelling east/west doesn't create or lose a day; dates are stored as the
  local date at check-in.
- Week start Monday vs Sunday.
- Longest streak never goes down.
- Squad streak: a day counts when every member did ≥ 1 shared habit; members who joined
  that day count from the next day; a member leaving doesn't break past days.

## Things I need from Job along the way

- Name pick (now).
- The JobDone code: a GitHub repo to attach to this project, or a zip upload (step 2).
- Whether you have a Mac (step 3).
- The Supabase project to use and which domain/subdomain (step 4).
- Apple Developer account sign-up, $99 (by step 8, needed for push and TestFlight).
- 12+ testers' Gmail addresses for Play, and TestFlight emails (step 15).
