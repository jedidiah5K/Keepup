// Today with a broken streak that can still be repaired, then ticking it to see the repair moment.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4193', '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', e => console.log('ERR', e.message));
await page.clock.setFixedTime(new Date(2026, 9, 23, 13, 0));
await page.route('**/*.supabase.co/**', r => r.fulfill({ status: 503, body: '{}' }));
await page.goto('http://localhost:4193/');
await page.evaluate(() => { const b64 = o => btoa(JSON.stringify(o)).replace(/=+$/, ''); const user = { id: '00000000-0000-0000-0000-0000000000aa', email: 'a@x.com' };
  localStorage.setItem('keepup-auth', JSON.stringify({ access_token: `${b64({ alg: 'HS256' })}.${b64({ sub: user.id, exp: 4102444800 })}.x`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user }));
  const day = n => new Date(Date.UTC(2026, 9, 23 - n)).toISOString().slice(0, 10);
  const H = (id, name, icon, colour) => ({ id, name, icon, colour, kind: 'yes_no', target_count: 1, schedule_type: 'daily', schedule_days: [], start_date: day(60), archived_at: null, sort_order: 0 });
  // Meditate: 20 days, missed 2 days ago (Wed), done yesterday. Read: 12 days, missed yesterday. Both used this week's freeze on Mon.
  const a = {}, r = {}; for (let n = 2 + 1; n < 24; n++) if (n !== 4) a[day(n)] = 1; a[day(1)] = 1;
  for (let n = 2; n < 15; n++) if (n !== 4) r[day(n)] = 1;
  localStorage.setItem('keepup:v1', JSON.stringify({ profile: { display_name: 'Alex', onboarded: true, theme: 'paper' }, syncedUser: user.id, habits: [H('a', 'Meditate', '🧘', 'mint'), H('r', 'Read 10 pages', '📖', 'grape')], checkins: { a, r }, pending: [] })); });
await page.reload(); await page.waitForTimeout(1600);
await page.evaluate(() => { document.getElementById('screen').scrollTop = 330; }); await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/33-repair-open.png' });
await page.click('.habit[data-id="a"] .tick'); await page.waitForTimeout(1300);
await page.screenshot({ path: 'shots/34-repair-done.png' });
await b.close(); server.kill();
