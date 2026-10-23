// Opens the app at phone size in light and dark, fills it with sample habits, and saves
// screenshots of each screen to shots/. Run: npm run build && npm run shots
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';

const exe = process.env.CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(existsSync);
const PORT = 4179, URL = `http://localhost:${PORT}/`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
mkdirSync('shots', { recursive: true });

// Sample data: 3 weeks of history so streaks, freezes and the heatmap show.
const seed = () => {
  const iso = d => d.toISOString().slice(0, 10), t = new Date(), day = n => iso(new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate() - n)));
  const H = (id, o) => ({ id, icon: '✅', colour: 'tangerine', kind: 'yes_no', target_count: 1, schedule_type: 'daily', schedule_days: [], times_per_week: null, reminder_time: null, start_date: day(60), archived_at: null, ...o });
  const habits = [
    H('w', { name: 'Drink water', icon: '💧', colour: 'lagoon', kind: 'count', target_count: 8, sort_order: 0 }),
    H('g', { name: 'Gym', icon: '🏋️', colour: 'tangerine', schedule_type: 'x_per_week', times_per_week: 3, sort_order: 1 }),
    H('r', { name: 'Read 10 pages', icon: '📖', colour: 'grape', sort_order: 2 }),
    H('s', { name: 'Skincare', icon: '🧴', colour: 'berry', sort_order: 3 }),
    H('p', { name: 'No phone before bed', icon: '📵', colour: 'cocoa', sort_order: 4 }),
  ];
  const checkins = { w: {}, g: {}, r: {}, s: {}, p: {} };
  for (let n = 1; n < 60; n++) {
    checkins.w[day(n)] = n % 9 === 0 ? 5 : 8;
    if (n % 7 === 1 || n % 7 === 3 || n % 7 === 5) checkins.g[day(n)] = 1;
    if (n !== 3 && n < 45) checkins.r[day(n)] = 1;
    if (n % 5) checkins.s[day(n)] = 1;
    if (n < 12 && n !== 6) checkins.p[day(n)] = 1;
  }
  checkins.w[day(0)] = 3; checkins.r[day(0)] = 1;
  localStorage.setItem('keepup:v1', JSON.stringify({ profile: { display_name: 'Alex', week_start: 1, theme: 'paper', onboarded: true, sounds_on: false }, habits, checkins, pending: [] }));
};

const browser = await chromium.launch({ executablePath: exe });
const sizes = [['390', { width: 390, height: 844 }], ['360', { width: 360, height: 800 }]];
for (const scheme of ['light', 'dark']) for (const [tag, viewport] of sizes) {
  if (tag === '360' && scheme === 'dark') continue;
  // 390 pretends to be an iPhone, 360 an Android phone, so both install guides get a picture.
  const userAgent = tag === '390' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: scheme, isMobile: true, hasTouch: true, userAgent });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  const shot = async name => { await page.waitForTimeout(1500); await page.screenshot({ path: `shots/${name}-${scheme}-${tag}.png` }); };
  // first run
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload();
  await shot('01-intro');
  await page.fill('[data-ob="name"]', 'Alex'); await page.click('[data-a="obNext"]'); await shot('02-intro-habits');
  // seeded app
  await page.evaluate(seed); await page.reload();
  await shot('03-today');
  await page.click('.habit[data-id="s"] .tick'); await page.click('.habit[data-id="p"] .tick'); await shot('04-today-ticked');
  for (let i = 0; i < 5; i++) await page.click('.habit[data-id="w"] .tick');
  await page.click('.habit[data-id="g"] .tick'); await page.evaluate(() => { document.getElementById('screen').scrollTop = 0; }); await page.waitForTimeout(900); await shot('05-today-alldone');
  await page.click('[data-a="newHabit"].fab'); await shot('06-new-habit');
  await page.click('[data-x="sched"][data-v="x_per_week"]'); await shot('07-new-habit-xweek');
  await page.keyboard.press('Escape');
  await page.click('.day:not(.now):not(:disabled) >> nth=0').catch(() => {}); await shot('08-today-pastday');
  await page.click('[data-tab="stats"]'); await shot('09-stats');
  await page.click('[data-a="openStats"][data-id="r"]'); await shot('10-stats-habit');
  await page.click('[data-tab="squad"]'); await shot('11-squad');
  await page.click('[data-tab="me"]'); await shot('12-me');
  await page.click('[data-a="manage"]'); await shot('13-manage');
  await page.keyboard.press('Escape');
  await page.click('[data-a="auth"][data-mode="up"]'); await shot('14-account');
  await page.fill('input[name=email]', 'nobody@example.com'); await page.fill('input[name=pw]', 'wrong-password-1');
  await page.click('[data-to="in"]').catch(() => {});
  await page.fill('input[name=email]', 'nobody@example.com'); await page.fill('input[name=pw]', 'wrong-password-1');
  await page.click('.auth button[type=submit]'); await page.waitForTimeout(2500); await shot('15-signin-wrong');
  await page.keyboard.press('Escape');
  await page.click('[data-a="install"]'); await shot('16-install-guide');
  await page.keyboard.press('Escape');
  await page.click('[data-tab="today"]'); await page.evaluate(() => { document.getElementById('screen').scrollTop = 9999; }); await shot('17-today-install-card');
  if (errors.length) console.log(scheme, tag, 'ERRORS:', errors);
  await ctx.close();
}
await browser.close(); server.kill();
console.log(readdirSync('shots').length, 'screenshots in shots/');
