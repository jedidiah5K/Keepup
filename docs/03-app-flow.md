# 3. App flow

Every screen and where each button goes. Bottom tabs: **Today · Squad · Stats · Me**.

## First run

```
Welcome ─▶ Sign up / Sign in
            ├─ Email + password ─▶ (sign up) Age check 13+ ─▶ Name
            ├─ Continue with Google ─▶ Age check ─▶ Name
            └─ Continue with Apple ─▶ Age check ─▶ Name
Name ─▶ Starter habits (tap to pick, or "Skip, I'll make my own")
     ─▶ Pick a theme ─▶ Reminders (on/off + time, asks phone permission)
     ─▶ "Invite a friend to your squad?" ─▶ [Create squad & share link] or [Skip]
     ─▶ Today
```

- Under 13 at age check: polite stop screen, no account created.
- Opened from an invite link and not signed in: after sign-up, onboarding ends on
  "Join <squad name>?" instead of the invite step.
- Forgot password: email ─▶ "If that email exists, we sent a link" ─▶ link ─▶ new password
  ─▶ signs out other sessions ─▶ Today.

## Today (home)

- **Week strip**: tap a day ─▶ same list for that day (editable if within 7 days, read-only
  older, with a lock note).
- **Habit row tap** (yes/no) ─▶ ticked + sound + haptic + burst. Tap again ─▶ undo.
- **Habit row tap** (count) ─▶ +1. Long-press ─▶ number picker / reset.
- **Habit row long-press / ⋯** ─▶ Edit habit, Stats for this habit, Archive.
- **All done** ─▶ "All done today!" card ─▶ [Share] (weekly recap card) or dismiss.
- **This week summary** card ─▶ Stats.
- **＋ button** ─▶ New habit.
- **Milestone reached** ─▶ badge / streak popup ─▶ [Share card] or [Nice].

## New / edit habit

Name, icon (emoji), colour, type (yes/no or count + target), schedule (every day /
pick days / X per week), reminder time, "Share with squad" toggle.
[Save] ─▶ back. Edit only: [Archive], [Delete] ─▶ confirm dialog.

## Manage habits (from Me)

Drag handles to reorder. Archived section ─▶ [Restore] or [Delete].

## Squad

- No squad yet ─▶ [Create squad] (name) ─▶ squad page; or [Join with link/code].
- **Squad page**: squad streak at the top, member list with today's check-ins and streaks.
  - Member who hasn't checked in ─▶ [👀 Nudge] (greyed out once used today).
  - [Invite] ─▶ share sheet with link (disabled when full; shows "5/5").
  - [Choose shared habits] ─▶ list of my habits with toggles.
  - [Squad streak card] ─▶ share card.
  - ⋯ ─▶ Rename (owner), Remove member (owner, confirm), Leave squad (confirm),
    Delete squad (owner, confirm).
- Pro: squad switcher at the top for several squads.
- Invite link opened ─▶ preview (squad name, member count) ─▶ [Join] ─▶ pick habits to
  share ─▶ squad page. Full squad ─▶ "This squad is full".

## Stats

Overall week/month numbers ─▶ tap a habit ─▶ habit stats: week %, month %, current and
longest streak, calendar heatmap (tap a day ─▶ that day in Today, if editable).
Pro sections show a small "Pro" tag ─▶ Pro screen.

## Me

- Profile (name) · Badges ─▶ badge grid ─▶ badge detail ─▶ [Share]
- Pro ─▶ Pro screen (or "You're Pro" + Manage subscription ─▶ store page)
- Appearance: theme, app icon (Pro) · Sounds · Haptics
- Reminders: defaults, evening reminder on/off + time, [Send test notification],
  "Reminders not showing?" help
- Week starts Monday/Sunday
- Manage habits
- Account: change password, export data (CSV / JSON ─▶ share sheet or download), sign out,
  delete account (type DELETE ─▶ everything removed ─▶ Welcome)
- Privacy policy, Terms, Send feedback (text box ─▶ thanks)

## Pro screen

What Pro includes (one list), three plans with store prices, nothing pre-selected,
[Restore purchases], "Cancel any time in the store, one tap". Purchase ─▶ store sheet ─▶
server confirms ─▶ "You're Pro" (or a clear error).
