// Screenshots of the signed-in Squad tab with a fake account and fake server answers, so the
// screen can be checked without a real squad. Run after npm run build: node tools/squad-shots.mjs
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 4180, URL = `http://localhost:${PORT}/`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
mkdirSync('shots', { recursive: true });

const iso = d => d.toISOString().slice(0, 10), t0 = new Date(), day = n => iso(new Date(Date.UTC(t0.getFullYear(), t0.getMonth(), t0.getDate() - n)));
const ME = '00000000-0000-0000-0000-0000000000aa', SAM = '00000000-0000-0000-0000-0000000000bb', RIA = '00000000-0000-0000-0000-0000000000cc', LEO = '00000000-0000-0000-0000-0000000000dd';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: ME, role: 'authenticated', exp: 4102444800 })}.x`;
const session = { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: { id: ME, email: 'alex@example.com', aud: 'authenticated', role: 'authenticated' } };

const board = [];
const add = (u, name, hid, hname, icon, colour, days) => { if (!days.length) board.push({ user_id: u, display_name: name, habit_id: hid, habit_name: hname, icon, colour, kind: 'yes_no', target_count: 1, date: null, count: null }); for (const n of days) board.push({ user_id: u, display_name: name, habit_id: hid, habit_name: hname, icon, colour, kind: 'yes_no', target_count: 1, date: day(n), count: 1 }); };
const range = (a, b, skip = []) => Array.from({ length: b - a + 1 }, (_, i) => a + i).filter(n => !skip.includes(n));
add(ME, 'Alex', 'r', 'Read 10 pages', 'i:book', 'grape', range(1, 20));
add(SAM, 'Sam Rivera', 's1', 'Run', 'i:run', 'tangerine', range(0, 20));
add(SAM, 'Sam Rivera', 's2', 'Water', 'i:water', 'lagoon', range(0, 20, [4]));
add(RIA, 'Ria', 'r1', 'Journal', 'i:write', 'berry', range(1, 20, [2]));
add(LEO, 'Leo', 'l1', 'Gym', 'i:lift', 'ocean', range(0, 20, [2]));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*.supabase.co/**', async route => {
    const u = route.request().url();
    const json = b => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (u.includes('/rpc/keepup_squad_board')) return json(board);
    if (u.includes('/rpc/keepup_import')) return json(0);
    if (u.includes('/rpc/keepup_nudge') || u.includes('/rpc/keepup_high_five')) return route.fulfill({ status: 204 });
    if (u.includes('keepup_squad_members') && u.includes('keepup_squads')) return json([{ squad_id: 'sq', user_id: ME, role: 'owner', joined_at: day(30) + 'T00:00:00Z', keepup_squads: { id: 'sq', name: '6am Club', owner_id: ME, invite_code: 'abc123', join_code: 'KX7PM2QD', created_at: day(30) } }]);
    if (u.includes('keepup_squad_members')) return json([ME, SAM, RIA, LEO].map((id, i) => ({ user_id: id, role: i ? 'member' : 'owner', joined_at: day(30 - i) + 'T00:00:00Z' })));
    if (u.includes('keepup_squad_shared_habits')) return json([{ habit_id: 'r' }, { habit_id: 's1' }, { habit_id: 's2' }, { habit_id: 'r1' }, { habit_id: 'l1' }]);
    if (u.includes('keepup_nudges')) return json([{ from_user: SAM, to_user: ME, date: day(0), kind: 'nudge' }, { from_user: LEO, to_user: ME, date: day(0), kind: 'five' }]);
    if (u.includes('keepup_profiles')) return route.request().method() === 'GET' ? json(null) : json([]);
    if (u.includes('keepup_habits')) return json([{ id: 'r', name: 'Read 10 pages', icon: 'i:book', colour: 'grape', kind: 'yes_no', target_count: 1, schedule_type: 'daily', schedule_days: [], times_per_week: null, reminder_time: null, sort_order: 0, start_date: day(40), archived_at: null }]);
    if (u.includes('keepup_checkins')) return json(range(1, 20).map(n => ({ habit_id: 'r', date: day(n), count: 1 })));
    return json([]);
  });
  await page.goto(URL);
  await page.evaluate(([s, d1]) => {
    localStorage.setItem('keepup-auth', JSON.stringify(s));
    localStorage.setItem('keepup:v1', JSON.stringify({ profile: { display_name: 'Alex', week_start: 1, theme: 'paper', onboarded: true }, syncedUser: s.user.id,
      habits: [{ id: 'r', name: 'Read 10 pages', icon: 'i:book', colour: 'grape', kind: 'yes_no', target_count: 1, schedule_type: 'daily', schedule_days: [], sort_order: 0, start_date: d1, archived_at: null }],
      checkins: { r: {} }, pending: [] }));
  }, [session, day(40)]);
  await page.reload(); await page.waitForTimeout(800);
  await page.click('[data-tab="squad"]'); await page.waitForTimeout(1800);
  await page.screenshot({ path: `shots/20-squad-${scheme}-390.png` });
  await page.click('[data-a="sqFive"]'); await page.waitForTimeout(900);
  await page.screenshot({ path: `shots/20b-squad-five-${scheme}-390.png` });
  await page.click('[data-tab="today"]'); await page.click('.habit[data-id="r"] .tick'); await page.waitForTimeout(400);
  await page.click('[data-tab="squad"]'); await page.waitForTimeout(1500);
  await page.screenshot({ path: `shots/21-squad-alldone-${scheme}-390.png` });
  await page.click('[data-a="sqInvite"]'); await page.waitForTimeout(900);
  await page.screenshot({ path: `shots/23-squad-invite-${scheme}-390.png` }); await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.click('[data-a="sqShare"]'); await page.waitForTimeout(1200);
  await page.screenshot({ path: `shots/22-squad-share-${scheme}-390.png` });
  if (errors.length) console.log(scheme, errors);
  await ctx.close();
}
await browser.close(); server.kill();
console.log('done');
