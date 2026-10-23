// Renders public/icons/icon.svg to the PNG sizes the manifest and iPhone need.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/icons/icon.svg', 'utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const n of [192, 512]) {
  const p = await b.newPage({ viewport: { width: n, height: n } });
  // Full-bleed square (no rounded corners) so phones apply their own mask.
  await p.setContent(`<style>*{margin:0}svg{display:block;width:${n}px;height:${n}px}</style>${svg.replace('rx="112"', 'rx="0"')}`);
  await p.screenshot({ path: `public/icons/icon-${n}.png` });
}
await b.close();
