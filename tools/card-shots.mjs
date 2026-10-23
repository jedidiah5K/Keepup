// Draws the share card in Paper and Midnight and saves it to shots/. Run: node tools/card-shots.mjs
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const server = spawn('npx', ['vite', '--port', '4183', '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 3500));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const theme of ['paper', 'midnight']) {
const page = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
page.on('pageerror', e => console.log('ERR', e.message));
await page.route('**/*.supabase.co/**', r => r.fulfill({ status: 503, body: '{}' }));
await page.goto('http://localhost:4183/');
await page.evaluate(theme => { const b64 = o => btoa(JSON.stringify(o)).replace(/=+$/, ''); const user = { id: '00000000-0000-0000-0000-0000000000aa', email: 'a@x.com' };
  localStorage.setItem('keepup-auth', JSON.stringify({ access_token: `${b64({ alg: 'HS256' })}.${b64({ sub: user.id, exp: 4102444800 })}.x`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user }));
  const t = new Date(), day = n => new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate() - n)).toISOString().slice(0, 10);
  const ck = {}; for (let n = 0; n < 44; n++) if (n !== 9 && n !== 17) ck[day(n)] = 1;
  localStorage.setItem('keepup:v1', JSON.stringify({ profile: { display_name: 'A', onboarded: true, theme }, syncedUser: user.id, habits: [{ id: 'r', name: 'Read 10 pages', icon: 'i:book', colour: 'grape', kind: 'yes_no', target_count: 1, schedule_type: 'daily', schedule_days: [], start_date: day(60), archived_at: null, sort_order: 0 }], checkins: { r: ck }, pending: [] })); }, theme);
await page.reload(); await page.waitForTimeout(1500);
const data = await page.evaluate(async () => { const { drawCard } = await import('/src/ui/share.js'); const { streakOf } = await import('/src/screens/today.js'); const { state } = await import('/src/lib/store.js'); const h = state.habits[0]; return (await drawCard(h, streakOf(h))).toDataURL(); });
writeFileSync(`shots/25-card-${theme}.png`, Buffer.from(data.split(',')[1], 'base64'));
await page.click('[data-tab="stats"]'); await page.waitForTimeout(700); await page.click('[data-a="openStats"]'); await page.waitForTimeout(1200);
await page.screenshot({ path: `shots/26-stats-share-${theme}.png` });
}
await b.close(); server.kill();
