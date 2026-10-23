# KeepUp

A habit tracker where the basics are free forever and unlimited, and you keep streaks together
with a small squad of friends. Android and iPhone launch together (planned December 2026).

- **Plan:** [docs/](docs/README.md) (PRD, tech plan, app flow, design, database, build order, JobDone reuse)
- **Stack:** vanilla JS (no framework, like JobDone) built with Vite, Supabase, Capacitor for the store apps

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # streak rules
npm run build && npm run shots   # phone-size screenshots into shots/
```

Database checks (needs a local Postgres; nothing touches the real project):

```sh
PGHOST=... PGPORT=... PGUSER=postgres tests/db/run.sh
```

## Layout

| Path | What it is |
|---|---|
| `src/lib/streaks.js` | Streak rules (freezes, X a week, squad streak), tested in `tests/streaks.test.js` |
| `src/lib/store.js` | State saved on the phone first, queued for sync |
| `src/screens/` | Today, Stats, Squad, Me, habit form, first-run intro |
| `src/ui/` | Sounds, haptics, confetti, sheets, drag-reorder (ported from JobDone) |
| `supabase/migrations/` | Tables (`keepup_*`), security rules, squad functions |
| `tests/db/` | Runs the migrations on a throwaway Postgres and checks every security rule |
