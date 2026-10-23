// Renders the 10 icon options in design/icons/ onto one comparison sheet.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const INK = '#121214', BONE = '#F4F3EF', ORANGE = '#FF4F1A', NAVY = '#2B2F45';
const sq = (bg, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${bg}"/>${body}</svg>`;
const OPTIONS = [
  ['1 · Peak', sq(INK, `<path d="M96 380 L256 150 L416 380Z" fill="${BONE}"/><circle cx="256" cy="150" r="30" fill="${ORANGE}"/>`)],
  ['2 · Flag', sq(BONE, `<path d="M190 400 V112" stroke="${INK}" stroke-width="30" stroke-linecap="round"/><path d="M204 116 L350 162 L204 208Z" fill="${ORANGE}"/>`)],
  ['3 · Trail', sq(INK, `<path d="M150 410 C 330 390, 360 320, 250 270 S 170 160, 330 110" fill="none" stroke="${ORANGE}" stroke-width="44" stroke-linecap="round"/><circle cx="330" cy="110" r="14" fill="${BONE}"/>`)],
  ['4 · Check peak', sq(ORANGE, `<path d="M110 300 L200 390 L330 140 L410 300" fill="none" stroke="${BONE}" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>`)],
  ['5 · K', sq(INK, `<text x="256" y="372" text-anchor="middle" font-family="IS" font-style="italic" font-size="330" fill="${BONE}">K</text><circle cx="356" cy="160" r="22" fill="${ORANGE}"/>`)],
  ['6 · Sunrise', sq(BONE, `<circle cx="256" cy="300" r="110" fill="${ORANGE}"/><path d="M0 300 L150 210 L256 280 L370 190 L512 290 V512 H0Z" fill="${INK}"/>`)],
  ['7 · Steps', sq(INK, `<circle cx="150" cy="350" r="40" fill="${BONE}" opacity=".35"/><circle cx="256" cy="256" r="40" fill="${BONE}" opacity=".65"/><circle cx="362" cy="162" r="40" fill="${ORANGE}"/>`)],
  ['8 · Ring', sq(INK, `<circle cx="256" cy="256" r="130" fill="none" stroke="#2A2A2E" stroke-width="44"/><path d="M256 126 A130 130 0 1 1 134 300" fill="none" stroke="${ORANGE}" stroke-width="44" stroke-linecap="round"/>`)],
  ['9 · Two peaks (squad)', sq(BONE, `<path d="M60 400 L200 190 L340 400Z" fill="${INK}"/><path d="M180 400 L320 150 L460 400Z" fill="${ORANGE}"/>`)],
  ['10 · Up', sq(ORANGE, `<path d="M130 330 L256 190 L382 330" fill="none" stroke="${BONE}" stroke-width="62" stroke-linecap="round" stroke-linejoin="round"/>`)],
];
OPTIONS.forEach(([n, svg], i) => writeFileSync(`design/icons/option-${i + 1}.svg`, svg));

const font = readFileSync('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2').toString('base64');
const cell = ([name, svg]) => `<figure><div class="ic">${svg}</div><div class="sm">${svg}</div><figcaption>${name}</figcaption></figure>`;
const html = `<style>@font-face{font-family:IS;font-style:italic;src:url(data:font/woff2;base64,${font})}
*{margin:0;box-sizing:border-box}body{background:#E9E7E1;font:600 22px/1.2 -apple-system,system-ui,sans-serif;color:#111;padding:48px}
h1{font:italic 400 64px Georgia,serif;margin-bottom:8px}p{font-weight:400;color:#666;margin-bottom:40px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:40px 32px}figure{display:grid;justify-items:center;gap:14px}
.ic,.sm{border-radius:22.4%;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.18)}.ic{width:200px;height:200px}.sm{width:60px;height:60px}
svg{display:block;width:100%;height:100%}</style>
<h1>KeepUp icon options</h1><p>Big, and at real home-screen size below each.</p><div class="grid">${OPTIONS.map(cell).join('')}</div>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
await p.setContent(html); await p.waitForTimeout(400);
await p.screenshot({ path: 'design/icons/options.png', fullPage: true });
await b.close();
console.log(readdirSync('design/icons').length, 'files');
