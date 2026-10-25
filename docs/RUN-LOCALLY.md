# Run KeepUp on your own computer

This runs the app on your computer instead of keepup-nine.vercel.app. It still uses the same online database (Supabase), so you sign in with the same account and see the same habits and squad.

It takes about 10 minutes the first time. After that, starting it again is step 4 only.

---

## 1. Install two free tools (once)

- **Node.js** (runs the app): go to https://nodejs.org and download the **LTS** version. Install it with the normal clicks.
- **Git** (downloads the code):
  - Mac: open **Terminal** and type `git --version`. If it asks to install "command line developer tools", click Install.
  - Windows: download from https://git-scm.com/download/win and install with the default options.

To check both work, open **Terminal** (Mac) or **PowerShell** (Windows) and type:

```
node --version
git --version
```

Each should print a version number.

## 2. Download the code (once)

In Terminal / PowerShell, paste these lines one at a time:

```
cd ~/Desktop
git clone https://github.com/jedidiah5K/Keepup.git
cd Keepup
git checkout claude/project-thread-gfzlxx
```

This makes a **Keepup** folder on your Desktop. The last line picks the branch with all the latest work.

If git asks you to sign in, use your GitHub account.

## 3. Install the app's parts (once)

Still in the Keepup folder:

```
npm install
```

It downloads what the app needs. That takes a minute or two. Warnings are fine. Only red "ERR!" lines are a problem.

## 4. Start it (every time)

```
cd ~/Desktop/Keepup
npm run dev
```

It prints something like `Local: http://localhost:5173/`. Open that link in your browser. The app is now running on your computer.

- Change a file in `src/` and save it: the page updates by itself.
- To stop it, click in the Terminal window and press **Ctrl + C**.

## 5. Get the latest changes (whenever I've pushed new work)

Stop it with Ctrl + C, then:

```
git pull
npm install
npm run dev
```

## Open it on your phone (same Wi-Fi)

Start it with this instead:

```
npm run dev -- --host
```

It prints a second link, like `Network: http://192.168.1.23:5173/`. Type that link into your phone's browser. The phone and computer must be on the same Wi-Fi.

What won't work this way: adding to home screen as a proper app, notifications and offline mode. Phones only allow those on secure (https) sites, like the Vercel one. Everything else works: ticking, squads, stats.

If the phone can't open it, your computer's firewall may be blocking it. On Mac, allow "node" when it asks. On Windows, click "Allow access" on the pop-up.

## Try the finished version (closer to the real thing)

```
npm run build
npm run preview
```

It opens at `http://localhost:4173/`. This is exactly what Vercel serves, including offline mode.

## Run the tests

```
npm test
```

All should say "passed".

---

### If something goes wrong

- **"command not found: npm"**: Node.js isn't installed, or Terminal was open before you installed it. Close Terminal, open it again, and retry.
- **"port 5173 is in use"**: it's already running in another Terminal window. Use that one, or close it.
- **The page is blank**: look in the Terminal window for red text and send me a screenshot.
- **Can't sign in**: check your internet. The database is still online.
