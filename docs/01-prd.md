# 1. Product requirements (PRD)

Status: draft for Job's approval. App name: **KeepUp** (store title "KeepUp: Habits with Friends").

## Overview

A habit tracker where the basics are free forever and unlimited, and you keep streaks
together with a small squad of friends.

Launch: **Google Play and the App Store at the same time**, plus the same app on the web
(installable PWA).

### Why

A study of 18,464 reviews of 6 habit apps found paywalls and subscriptions were the #1
complaint, ahead of broken notifications and crashes. People hate 3–4 habit caps, habits
being "archived" when a trial ends, hard cancelling, lost data after updates, and
"subscribe" prompts after they already paid.

### Our promise (shown in the app and store listing)

1. Unlimited habits, free.
2. Logging is never paywalled.
3. Streak history is never hidden.
4. No surprise charges. Cancelling is one tap (we link straight to the store's
   subscription page).
5. If Pro ends, nothing is deleted or hidden.

## Users

- Main: teens and young adults, 16–28, building habits like gym, reading, studying,
  water, sleep, skincare, no phone before bed.
- They tried Habitica, Streaks, Loop, HabitNow, Finch and quit because of paywalls,
  clutter, or getting bored alone.
- 13+ only. Age gate at sign-up. We never target under-13s.

## Features in version 1

**Habits.** Name, emoji/icon, colour. Schedule: every day, specific weekdays, or X times
per week. Type: yes/no or count (e.g. 8 glasses). Optional reminder time. Drag to reorder,
archive (never automatic), delete with confirm. Unlimited.

**Today screen.** Today's habits with big tap targets; sound + haptic + small celebration on
tick. Current streak on each. Week strip at the top: tap a past day to fix it (last 7 days
editable). "All done today!" moment.

**Streaks (fair rules).**
- Daily / weekday habits: consecutive *scheduled* days completed.
- X per week: consecutive weeks where the target was hit.
- Streak freeze: 1 free per week, used automatically on a missed day.
- Show current and longest streak.

**Squads (key feature).** 2–5 friends (free). Invite link for group chats. Each person
chooses which habits to share; the rest stay private. Squad screen: everyone's check-ins
today and their streaks. Squad streak grows on days when every member completes at
least one shared habit. Nudge a friend who hasn't checked in (1 per friend per day).
Leave squad; owner can remove members. Members only ever see shared habit names and
their check-ins.

**Stats (free).** Per habit: this week / this month %, current and longest streak, calendar
heatmap. "This week" summary on Today.

**Share cards.** Streak milestones (7, 30, 100, 365), weekly recap, squad streak. App name
and a "get the app" line on every card. Reuses JobDone's renderer.

**Badges.** 20–30 habit badges, reusing JobDone's badge system.

**Notifications.** Per-habit reminders, evening "X habits left" (can turn off), squad
nudges, "squad streak about to break". Reliability is a top priority (complaint #2).

**Onboarding (<60 s).** Account (email + password, Google, and Apple on iPhone), name,
starter habits, theme, reminders, "invite a friend?" (skippable).

**Me / Settings.** Theme, sounds, haptics, reminder defaults, week starts Mon/Sun, export
(CSV/JSON), delete account (type DELETE), change password, privacy, terms, feedback,
manage subscription.

## Later (not version 1)

Home-screen widgets (Android and iOS), Apple Health / Google Fit, AI coaching, public
leaderboards or chat with strangers, payments outside the stores.

## Free vs Pro

**Free forever** (never moved behind a paywall):
- unlimited habits, logging, reminders
- full streak history and basic stats
- 1 squad, up to 5 people
- 1 streak freeze per week
- default themes, share cards

**Pro**: $2.99/month, $19.99/year, $39.99 lifetime. Same prices on Android and iPhone.
- extra themes and app icons
- advanced stats (best weekdays, time-of-day patterns, yearly heatmap, compare habits)
- unlimited squads, up to 15 people each
- 2 extra streak freezes per week (3 total)
- custom habit icons, notes on check-ins
- monthly report card

**Pro rules.** One honest Pro screen. No fake timers, no pre-ticked yearly plan. Only the
server decides who is Pro, after checking with Google or Apple. When Pro ends, extras stop
working and all data stays (e.g. a 10-person squad keeps everyone, it just can't add more;
old check-in notes stay readable).

## Success metrics

| Metric | Target for first 3 months |
|---|---|
| Day-1 / day-7 / day-30 retention | 40% / 20% / 10% |
| Users who join or create a squad | 30% |
| Share cards created per 100 weekly users | 10 |
| Pro conversion | 2–3% |
| Crash-free sessions | 99.5% |
| Reminder delivered on time (sampled) | 98% |
| Store rating | 4.5+ |

## Open questions for Job

1. ~~Name~~ KeepUp, picked 23 Oct.
2. Streak freeze: is the free freeze **per habit** (each habit gets 1 a week) or **one
   per account** shared by all habits? I suggest per habit: it's simpler to understand and
   avoids "which habit used my freeze?".
3. Do you have a Mac? Building the iPhone app needs Xcode (see TRD for a free cloud option).
4. Domain: buy one now, or start on a free `keepup-….vercel.app` address?
