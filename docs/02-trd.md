# 2. Technical requirements (TRD)

Status: draft for Job's approval. Facts checked 23 Oct 2026; re-check with Context7 /
official docs when building each part.

## The big change from the original prompt

The prompt planned a PWA wrapped for Play as a Trusted Web Activity (TWA), with iPhone
later. Since both stores launch together, **I recommend wrapping the same web app with
Capacitor for both Android and iPhone instead of TWA.** Plain words: Capacitor puts our
web app inside a real native app shell, and lets the web code call native phone features.

Why:

| Need | TWA (Android only) | Capacitor (Android + iPhone) |
|---|---|---|
| One wrapper for both stores | No, iPhone needs something else anyway | Yes |
| Apple accepting it | n/a | Native features (local notifications, haptics, IAP, Sign in with Apple) help pass Apple's "not just a website" rule (guideline 4.2) |
| Reliable reminders | Web push only; Chrome can delay it | **Local notifications scheduled on the phone**: fire even offline, no server needed |
| Push on iPhone | Web push doesn't work inside an App Store wrapper | Native push (APNs) |
| Payments | Digital Goods API + Play Billing | Native Play Billing and StoreKit through one plugin |

The web app stays a normal PWA too, so it still works in a browser and the code is the
same everywhere. Nothing else in the stack changes.

## Stack

| Part | Choice | Cost |
|---|---|---|
| Front end | Vanilla JS like JobDone (no framework), split into modules and built with Vite, installable PWA with a service worker. See `07-jobdone-reuse.md` | $0 |
| Native shell | Capacitor (current major), Android + iOS projects in this repo | $0 |
| Database + auth | Supabase (Postgres, Auth, RLS, Edge Functions, pg_cron). Shares JobDone's free project, tables named `keepup_*` like JobDone's `jobdone_*` | $0 while small |
| Email | Resend (reset emails), same as JobDone | $0 tier |
| Hosting (web) | Vercel like JobDone, same security headers; subdomain of your domain once bought | $0 |
| Push | Firebase Cloud Messaging (Android, and iPhone via an APNs key), web push (VAPID) for browser users | $0 |
| Payments | RevenueCat (Capacitor SDK) on top of Google Play Billing and Apple StoreKit, with a webhook to our server | $0 under $2,500/month revenue, then 1% |
| Bot protection | Cloudflare Turnstile (sign-up, reset) | $0 |
| Tests | Vitest (streak rules etc.), Playwright (phone-size screenshots) | $0 |
| iPhone builds | Your Mac with Xcode, or a free cloud Mac (e.g. Codemagic's free monthly minutes) | $0 |

**Money needed:** Apple Developer $99/year (now needed in year 1, already in your $134
budget), Google Play $25 (already paid), domain ~$10. Nothing else until real users.

## Current store rules that affect us

- **Google Play target SDK:** new apps and updates must target Android 16 (API 36) since
  31 Aug 2026. Capacitor's current version supports this.
- **Play Billing Library:** version 8 or newer required since 31 Aug 2026. The RevenueCat
  SDK bundles a compliant version; we keep it updated.
- **Play closed test:** still 12 testers opted in for 14 days in a row for new personal
  accounts (was 20 until Dec 2024). Pausing the test restarts the clock.
- **Apple guideline 4.2:** a plain website in a frame gets rejected. Our native touches:
  local notifications, push, haptics, StoreKit, Sign in with Apple, share sheet, offline.
- **Apple login rule (4.8):** if we offer Google sign-in on iPhone we must also offer an
  equally private option. Sign in with Apple covers it.
- **Account deletion:** both stores require in-app delete account. Already planned.
- **Age rules:** Texas age-assurance rules for the App Store started 4 Jun 2026 (Apple's
  Declared Age Range API; parents can approve or revoke). Google has a similar Play Age
  Signals API. We'll check which states apply at build time and wire these in, on top of
  our own 13+ gate.
- **Exact alarms on Android:** newer Android blocks exact alarms by default for apps that
  aren't alarm clocks. We'll use "allow while idle" notifications and ask for the exact
  alarm permission only if users opt in to precise timing.

## Payments (Play + Apple), server-verified

1. Products set up in Play Console and App Store Connect: `pro_monthly` ($2.99),
   `pro_yearly` ($19.99), `pro_lifetime` ($39.99, one-time). Prices live in the stores, not
   in our code.
2. App shows prices fetched from the store (so they're local and correct).
3. Purchase happens through the native store sheet.
4. RevenueCat verifies the receipt with Google/Apple **on their server**, then calls our
   Supabase Edge Function webhook (signed with a secret).
5. The webhook writes `keepup_subscriptions` with the service role key. The client can't
   write that table.
6. The app asks the server "am I Pro?" (a database function reading `subscriptions`).
7. Restore purchases button; "Manage subscription" opens the store's own page (one tap
   cancel).
8. Web: no selling on the web in v1. Pro bought on a phone also works on the web.

Fallback if you'd rather not use RevenueCat: verify directly with the Google Play
Developer API (+ real-time notifications via Pub/Sub) and the App Store Server API
(+ Server Notifications V2). More code, same result.

## Notifications

| Kind | How | Why |
|---|---|---|
| Per-habit reminder | Local notification scheduled on the phone (Capacitor Local Notifications) | Works offline, no server, most reliable |
| Evening "X left" | Local notification, rescheduled after every check-in (cancelled if all done) | Same |
| Nudge from a friend | Server push (Edge Function → FCM → Android / iPhone) | Comes from another person |
| "Squad streak about to break" | pg_cron job each 15 min finds members whose local time is ~8 pm and who haven't checked in, sends push | Server knows squad state |
| Browser users | Web push (VAPID) from the same Edge Function | PWA support |

Reliability checks: reschedule all local reminders on app open, after reboot, after
timezone change; a "send test notification" button; tips screen for phones that kill apps
in the background (Xiaomi, Samsung battery settings).

## Offline and sync

Check-ins are saved to the phone first (IndexedDB) and show instantly, then sync in the
background. Each check-in has a client-made id so retries never double count. Conflicts:
last write wins per (habit, date).

## Auth

Supabase Auth: email + password, Google, Apple (iPhone, and optional on Android/web).
Native sign-in on phones (token passed to Supabase), redirect flow on web. Reset emails via
Resend. Rate limits, Turnstile, lockout per the security checklist.

## Libraries (to confirm versions with Context7 at build time)

`@supabase/supabase-js`, `@capacitor/core` + `android` + `ios`,
`@capacitor/local-notifications`, `@capacitor/push-notifications`, `@capacitor/haptics`,
`@capacitor/share`, `@capacitor/preferences`, `@revenuecat/purchases-capacitor`,
`idb` (offline store), `vite`, `vitest`, `@playwright/test`. supabase-js pinned to a current 2.x (JobDone vendors 2.45.4).
