// The three intro cards before sign-up, at phone size. Run: node tools/intro-shots.mjs
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4190', '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const scheme of ['light', 'dark']) {
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, isMobile: true, hasTouch: true })).newPage();
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.route('**/*.supabase.co/**', r => r.fulfill({ status: 503, body: '{}' }));
  await page.goto('http://localhost:4190/'); await page.evaluate(() => localStorage.clear()); await page.reload();
  for (let i = 0; i < 3; i++) {
    await page.evaluate(i => { const c = document.querySelector('.cards'); c.dispatchEvent(new Event('pointerdown')); c.scrollTo({ left: i * c.clientWidth }); }, i);
    await page.waitForTimeout(i ? 1700 : 1400);
    await page.screenshot({ path: `shots/32-intro-${i + 1}-${scheme}.png` });
  }
}
await b.close(); server.kill();
