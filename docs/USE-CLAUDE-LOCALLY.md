# Keep building KeepUp with Claude on your own computer

The project now has a `CLAUDE.md` file in its main folder. Claude Code reads it automatically every time it starts there. It holds everything Claude needs to know: what KeepUp is, your rules, how the code is laid out, how database changes work, and your design taste. So a local Claude picks up where this one left off.

## 1. Get the code (once)

You need **Node.js** (LTS, from https://nodejs.org) and **Git**. Then, in Terminal (Mac) or PowerShell (Windows):

```
cd ~/Desktop
git clone https://github.com/jedidiah5K/Keepup.git
cd Keepup
git checkout claude/project-thread-gfzlxx
npm install
```

## 2. Install Claude Code (once)

Follow the install steps at https://code.claude.com/docs (one command), then sign in with your Claude account when it asks.

Or use the **Claude desktop app** and open the Keepup folder there.

## 3. Start Claude in the project (every time)

```
cd ~/Desktop/Keepup
claude
```

Then just talk to it, for example "add a dark mode toggle to the habit form", or "run the app so I can see it". It will:
- read `CLAUDE.md` first
- start the app at http://localhost:5173 (`npm run dev`)
- run the tests (`npm test`)

## Things to know

- **Pushing still deploys live.** When Claude pushes to `claude/project-thread-gfzlxx`, Vercel updates keepup-nine.vercel.app. If you want to try things without touching the live site, ask Claude to work on a new branch.
- **Same database.** Local and online both use your Supabase "JobDone" project. So your account and habits are the same, and real data can change while you test.
- **Database changes** are still SQL files you paste into Supabase. `CLAUDE.md` tells Claude to do it that way.
- **Setup 7 isn't pasted yet.** It's `/mnt/project-files/sql/keepup-setup-7.sql`, and the same SQL is in `supabase/migrations/0008_keepup_when.sql`.
- To get changes made online (here) onto your computer: `git pull`.
