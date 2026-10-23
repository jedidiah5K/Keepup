# 4. UI/UX brief

The `~/.claude/design-references/` folder isn't in this build environment, so this brief
starts from JobDone's theme system (to be adapted once I see it) with its own personality.

## Feel

Friendly, a bit playful, confident. Like a sticker-covered notebook you share with friends,
not a productivity dashboard. No purple gradients, no glassy blobs, no "three rounded
feature cards".

## Palette (default theme, "Paper")

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F6F1E7` warm paper | `#151412` | page |
| `--surface` | `#FFFFFF` | `#22201C` | cards, rows |
| `--ink` | `#1C1A17` | `#F3EEE4` | main text |
| `--ink-muted` | `#6B655B` | `#A8A196` | secondary text (≥4.5:1 contrast) |
| `--accent` | `#FF5A1F` tangerine | `#FF7A45` | tick, streak flame, main buttons |
| `--done` | `#1F9D55` | `#3CC97A` | completed state |
| `--freeze` | `#3A8DDE` | `#6AB0F0` | frozen days |
| `--line` | `#E4DCCD` | `#36322C` | dividers |

Habit colours: 10 picks, each tested to show a readable tick on top in both modes.

Extra themes (Pro, plus 1–2 free): adapt JobDone's 4 looks so the free set covers light
and dark, e.g. "Paper" (free), "Midnight" (free), "Gym" (bold), "Pastel".

## Type

- Headings: **Bricolage Grotesque** (characterful, free on Google Fonts).
- Body/UI: **Inter**.
- Numbers (streaks, counts): Inter with tabular figures, big and bold.
- All sizes in `rem` so they grow with the phone's font size setting.

## Components

- **Habit row**: 72px tall, icon left, name + streak middle, big round check button right
  (56px). Count habits show a progress ring with "3/8".
- **Week strip**: 7 day pills; today filled; each pill has a tiny ring showing % done.
- **Streak chip**: 🔥 number; ❄️ when a freeze saved the streak.
- **Squad member row**: avatar (initials on habit colour), name, today's shared habits as
  small dots, streak, nudge button.
- **Heatmap**: GitHub-style squares in the habit colour; freeze days blue outline.
- **Bottom sheet** for edit/new habit and confirms.
- **Skeleton loaders** (shimmer rows) instead of spinners.
- **Toast** for undo ("Unticked Water · Undo").
- **Icon buttons** always have a label for screen readers and a tooltip on long-press.

## Motion and feedback

- Tick: check button squashes, fills, 8–12 confetti dots in the habit colour, light haptic,
  short "pop" sound. Under 400 ms. Respects "reduce motion" and the sound/haptic toggles.
- All done: bigger burst, medium haptic, "All done today!" card slides up.
- Milestone: full-screen card with the flame number counting up.

## Rough sketches

```
Today                         Squad: Gym Rats      🔥 12
┌──────────────────────────┐  ┌──────────────────────────┐
│ M  T  W [T] F  S  S      │  │ You     ●●○   🔥 9        │
│ This week: 18/24 ▓▓▓▓▓░  │  │ Alex    ○○○   🔥 4  [👀]  │
├──────────────────────────┤  │ Sam     ●●●   🔥 21       │
│ 💧 Water  3/8  🔥 5  (◔) │  │ Priya   ●○    🔥 2  [👀]  │
│ 🏋️ Gym    2/3 wk 🔥3w (✓)│  ├──────────────────────────┤
│ 📖 Read 20m    🔥 12  ( )│  │ [Invite 4/5] [Shared ⚙]  │
│ 📵 No phone    ❄️ 7   ( )│  └──────────────────────────┘
│                    [＋]  │
└──────────────────────────┘
 Today   Squad   Stats   Me
```

## Accessibility

Contrast AA in both modes, 44×44px minimum tap targets (we use bigger), works with system
font size up to 200%, screen reader labels on everything, no info by colour alone (ticks
also change shape).

## Checking screens

Every screen is opened at phone size (390×844 and 360×800) in light and dark and
screenshotted before it's called done.
