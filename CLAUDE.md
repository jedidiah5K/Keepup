# KeepUp: notes for Claude

KeepUp is a habit tracker with squads (small friend groups that keep a shared streak). The owner is **Job**. He's not a professional developer, so keep explanations plain and short.

- Live beta: https://keepup-nine.vercel.app. Vercel auto-deploys every push to branch `claude/project-thread-gfzlxx`.
- Target: Android and iPhone store launch on the same day, December 2026. For now the beta is the web app, installed to the home screen (a PWA).
- Plan documents are in `docs/`: PRD, tech design, app flow, UI brief, DB schema, implementation plan.

## Ground rules

- **Ask Job first** before spending money, publishing anything to app stores, renaming the app, or touching the **JobDone** app or its database. (JobDone is his other live app. Code was reused from https://github.com/jedidiah5K/JobDone, which is read-only.)
- No paywall on basics. Everything is free during beta.
- Sign-in is **email + password only**: no Google, no email confirmation, no magic links. Email links open Safari instead of the home-screen app. Sign-up has a confirm-password field.
- Never put secrets in the code or in git: the Supabase service-role key, the VAPID private key, or tokens. The Supabase *publishable* key in `src/lib/cloud.js` is meant to be public.
- Work on branch `claude/project-thread-gfzlxx`, and remember that pushing it deploys live. Run the tests before pushing.

## Stack

- Vanilla JS and Vite. No framework. It's a PWA, with `public/sw.js` as the service worker and the manifest in `public/`.
- Supabase project **"JobDone"** (capital J, ref `xgmwqpasogwlvtjaapwo`). This is Job's spare project, not the live lowercase "jobdone" one.
  - All KeepUp tables are prefixed `keepup_`.
  - The project is shared with Job's other app **Petal** (`petal` schema). Never touch it.
- Fonts: Instrument Serif (display), Geist (UI) and Geist Mono (labels).
- Reminders use Web Push and a Supabase edge function, `supabase/functions/keepup-reminders`.

## Layout

```
src/main.js            app shell, tabs, click actions (ACTIONS), habit sheet, badge
src/screens/           today, squad, stats, me, habitForm, intro, account
src/lib/store.js       local-first state in localStorage ('keepup:v1') + queue of changes to sync
src/lib/cloud.js       Supabase auth + sync (push queued changes, pull account data)
src/lib/streaks.js     habit streaks, freezes (1/week), repair, breaks, squad streak
src/lib/insights.js    "Your week" best/worst weekday
src/lib/squads.js      squad loading, invites/join codes, nudges, high fives
src/ui/                icons, sheets/toasts, sounds+haptics (feedback.js), swipe, scene (mountain hero)
supabase/migrations/   numbered SQL, source of truth for the DB
tests/                 vitest unit tests; tests/db/ = SQL tests on a throwaway Postgres
tools/                 Playwright screenshot scripts
```

## Commands

```
npm install
npm run dev        # http://localhost:5173 (add -- --host to open on a phone on the same Wi-Fi)
npm test           # vitest, should all pass
npm run build      # production build into dist/
npm run preview    # serve the build at http://localhost:4173 (service worker on)
```

To run the DB tests you need a local Postgres 16:

```
sh tests/db/run.sh
```

It prints `ok:` lines. Any `FAILED` line is a problem.

## Database changes

- Add a new numbered file in `supabase/migrations/` (next one is `0009_...`). Make it safe to run twice: `if not exists`, `drop constraint if exists` and so on. Add tests in `tests/db/rls_test.sql`.
- Job applies changes himself. Write a paste file with the same SQL, headed with: "Paste into Supabase → "JobDone" project → SQL Editor → New query → Run." Then give him those steps.
- Use the Supabase MCP to write to the DB only if Job is there and asks for it.
- The app must keep working before he pastes. `src/lib/cloud.js` drops newer habit columns the server doesn't know yet (see `NEWER` / `withCols`).

**DB status (2026-10-25):** setups 1–6 are applied. **Setup 7** (`0008_keepup_when.sql`) is **not applied yet**. It adds:
- habit `time_of_day` and `cue`
- no reminders on skipped days

The edge function deploy and the VAPID secrets for reminders are unconfirmed (ask Job). The function code is in `supabase/functions/keepup-reminders`.

## How things work (non-obvious)

- **Local-first.** Every change is saved on the phone first and queued in `state.pending`, then synced. The app works offline.
- **Check-ins** are `state.checkins[habitId][date] = count`.
  - A **count of 0 means "skipped"**: it neither counts for nor breaks the streak (`isSkipped`, `skipDay`).
  - No entry means not done.
- **Streaks.** Each habit gets 1 freeze a week, used automatically. Two done days right after a miss "repair" the streak (once per 14 days). Breaks (up to 30 days) pause everything.
- **Squad streak.** It needs everyone done each day, and the squad gets 1 freeze a week. Job confirmed this on 2026-10-24.
- **Today.** Habits with a part of the day are grouped under Morning / Afternoon / Evening / Any time. Swipe a row left for Skip / Edit / Delete. Press and hold the circle for the habit sheet.
- **Days older than a week are locked**, so streaks stay honest.
- **Habits can have an end date** (assignments, exams). Today counts down to it, and the habit leaves Today after that day.

## Design taste (Job)

- He loves cool, animated, high-craft UI with sound and haptics, and wants it to look *less "AI"*: custom type, minimal layouts, smooth springs, small delightful moments.
- Themes: Paper (light), Midnight (dark), plus two more, all free in beta.
- The icon is a "check-peak" (a checkmark whose stroke rises to a peak) in white on black with an orange dot.
- Inspiration images are inspiration only. Never copy them.
- Check new UI at 320px and 390px wide, in light and dark. Respect `prefers-reduced-motion`. Keep contrast WCAG AA.

## Working with Job

- Short, plain-word updates. Lead with what changed and anything he needs to do.
- When you finish something, say what it is and how to see it, for example "refresh the app".
- Commit messages are plain sentences describing the change.
