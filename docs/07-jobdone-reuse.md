# 7. What we reuse from JobDone

Source: github.com/jedidiah5K/JobDone (read only, never changed). Looked at 23 Oct 2026.

## How JobDone is built

- **Vanilla JavaScript, no framework.** The whole app is `app.js` (~3,700 lines) plus
  `styles.css`. `build.py` puts them into one `web/index.html` and adds a strict content
  security policy.
- **Hosting:** Vercel, serving the `web/` folder (`jobdone-peach.vercel.app`), with strong
  security headers in `vercel.json` (HSTS, no framing, nosniff…).
- **Supabase project** `xvyibgnjibzopwtxajin`, tables in `public` named `jobdone_*`.
  Data is stored as JSON documents (`jobdone_docs`: one row per user per "path").
- **Edge Functions:** `signup` (honeypot, timing check, per-IP limit, 13+ check, no
  enumeration), `delete-account`, `rest-push` (web push with VAPID + pg_cron), `steps`.
- **Offline:** service worker caches the shell; changes are saved to the phone first and
  a "pending" list is retried when the signal returns.

## Decision for KeepUp's front end

Keep JobDone's approach (**vanilla JS, no framework**) so its code copies over almost
as-is. One upgrade: split into small files (ES modules) built with **Vite**, because KeepUp
is bigger, needs unit tests for streak rules, and Capacitor (the phone wrapper) expects a
normal build folder. Still no framework.

## Data model: different on purpose

JobDone's "one JSON document per user" works because nobody else ever reads your data.
KeepUp squads need friends to read *some* of your habits and check-ins, which is only
safe with real tables and row-level rules (see `05-backend-schema.md`). So we copy the
offline "save on phone first, sync later" idea, not the storage format.

To match JobDone in the shared Supabase project, KeepUp tables use the **`keepup_`
prefix in `public`** (e.g. `keepup_habits`, `keepup_checkins`) instead of a separate schema.
Same safety (RLS on every table), less setup.

## Reuse map

| KeepUp needs | JobDone piece (app.js section) | Plan |
|---|---|---|
| Haptics | `buzz()` (Android vibrate, iPhone switch trick) | Copy; inside the phone app use Capacitor Haptics instead, keep `buzz()` for web |
| Tick sounds | `Sound` (Web Audio synth, no files, works with music playing) | Copy as-is; add a "tick" and "all done" sound |
| Confetti | confetti burst for PRs | Copy for check-in and all-done celebrations |
| Themes | `THEMES` list, saved to profile + localStorage, sky that follows the clock | Copy the **system**; make new KeepUp looks (see note below) |
| Share cards | `drawShare()` canvas 1080×1350 + 9:16 story size, per-theme cards, invite line | Copy the renderer; new card layouts for streak, weekly recap, squad streak |
| Badges | `BADGES` list + `badgeList()` progress + badge grid/sheet | Copy the pattern; new habit badges |
| Monthly report | `monthData()` | Adapt for Pro report card |
| Recap screen | "Job's done!" finish page | Adapt as the "All done today!" moment |
| Intro flow | `OB_STEPS` onboarding | Copy the step engine; KeepUp steps: name, starter habits, theme, reminders, invite |
| Sheets, toasts, pull-to-close, drag reorder | toast & sheets, `.dsort` drag | Copy as-is |
| Charts | charts section | Copy for stats; add heatmap |
| Me / settings rows | iOS-style settings rows | Copy |
| Sign-in, reset, change password, 2-step sign-in | hosted Supabase section, MFA section | Copy; add Google + Apple sign-in |
| Sign-up guard | `signup` Edge Function | Copy; add Turnstile; **fix the bug below** |
| Delete account | `delete-account` function | Copy; delete KeepUp rows |
| Web push | `rest-push` function + `sw.js` push handler + pg_cron | Copy for browser users; phones use FCM/APNs |
| Feedback inbox, crash notes | feedback, `jobdone_errors` | Copy |
| Weekly backup | `weekly-backup.sql` | Copy for `keepup_*` tables |
| Privacy, terms, 404, security.txt, CSP, `vercel.json` headers | `web-src/`, `build.py`, `vercel.json` | Copy and rewrite text for KeepUp |
| Add to Home Screen guide | guide section | Keep for web only (phones install from the stores) |

## Things to know (JobDone is not changed; just telling you)

1. **Probable bug in JobDone's sign-up limit.** `signup/index.ts` counts recent sign-ups
   with `.gte('at', since)`, but `schema.sql` names that column `created_at`. If the live
   table matches `schema.sql`, the query errors, the count reads as 0, and the 5-per-hour
   limit never kicks in. KeepUp's copy will use the right column. Want me to fix JobDone too?
   (Only with your OK.)
2. **Themes and store rules.** JobDone's Skyline (Spider-Man style) and Agent (Hitman
   style) looks are fine for a personal app, but selling them as Pro themes in the stores
   could get flagged for copying other brands. KeepUp gets its own original looks.
3. **Sign-up skips email confirmation** in JobDone (`email_confirm: true`). For KeepUp,
   with friends and squads, I'd keep confirmation on so nobody can sign up with someone
   else's email.
4. **No custom domain yet.** JobDone lives on `jobdone-peach.vercel.app`. Your budget plans
   one ~$10 domain with a subdomain per app. Until you buy it, KeepUp can live on a free
   `keepup-….vercel.app` address; the store apps don't need a domain to work, but the
   privacy page and email sender look more trustworthy with one.
