// Today at 8am and 8pm with a missed yesterday, for the fill-in prompt and streak-at-risk line.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4184', '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [hour, name] of [[8, 'morning'], [20, 'evening']]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.clock.setFixedTime(new Date(2026, 9, process.env.DAY ? +process.env.DAY : 23, hour, 0));
  await page.route('**/*.supabase.co/**', r => r.fulfill({ status: 503, body: '{}' }));
  await page.goto('http://localhost:4184/');
  await page.evaluate(() => { const b64 = o => btoa(JSON.stringify(o)).replace(/=+$/, ''); const user = { id: '00000000-0000-0000-0000-0000000000aa', email: 'a@x.com' };
    localStorage.setItem('keepup-auth', JSON.stringify({ access_token: `${b64({ alg: 'HS256' })}.${b64({ sub: user.id, exp: 4102444800 })}.x`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user }));
    const day = n => new Date(Date.UTC(2026, 9, 23 - n)).toISOString().slice(0, 10);
    const H = (id, name, icon, colour) => ({ id, name, icon, colour, kind: 'yes_no', target_count: 1, schedule_type: 'daily', schedule_days: [], start_date: day(60), archived_at: null, sort_order: 0 });
    const a = {}, r = {}; for (let n = 1; n < 30; n++) { a[day(n)] = 1; if (n > 1) r[day(n)] = 1; }
    localStorage.setItem('keepup:v1', JSON.stringify({ profile: { display_name: 'Alex', onboarded: true, theme: 'paper' }, syncedUser: user.id, habits: [H('a', 'Meditate', '🧘', 'mint'), H('r', 'Read 10 pages', '📖', 'grape')], checkins: { a, r }, pending: [] })); });
  await page.reload(); await page.waitForTimeout(1800);
  await page.evaluate(() => { document.getElementById('screen').scrollTop = 330; }); await page.waitForTimeout(400);
  await page.screenshot({ path: `shots/27-today-${name}.png` });
  await ctx.close();
}
await b.close(); server.kill();
