// The Today scene: a sky that follows the clock (sunrise, day, sunset, night with stars),
// three mountain ridges, and a trail that climbs to the summit as you tick off today's habits.
// The sky colours come from JobDone's Summit theme (skyNow), redrawn in a calmer, line-led style.

const SKY = [
  [0, '#0B1024', '#141B3B', '#26304F', 1],
  [5, '#1B1F4A', '#5B4F7E', '#E59A7A', .4],
  [6.5, '#86B4DC', '#F2CBB0', '#F5B08D', 0],
  [9, '#8DBFE6', '#B8DAF0', '#E6F1F5', 0],
  [16.5, '#8DBFE6', '#B8DAF0', '#EEF2EC', 0],
  [18, '#4A63A0', '#E9926A', '#F8C98A', 0],
  [19.5, '#1D2453', '#6A4279', '#C46A7E', .3],
  [21, '#0B1024', '#141B3B', '#26304F', 1],
  [24, '#0B1024', '#141B3B', '#26304F', 1],
];
export function skyNow(h) {
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
  const a = SKY[i], b = SKY[i + 1], f = (h - a[0]) / (b[0] - a[0]);
  const hx = x => [1, 3, 5].map(j => parseInt(x.substr(j, 2), 16));
  const col = (p, q) => '#' + hx(p).map((v, j) => Math.round(v + (hx(q)[j] - v) * f).toString(16).padStart(2, '0')).join('');
  return { s1: col(a[1], b[1]), s2: col(a[2], b[2]), s3: col(a[3], b[3]), stars: a[4] + (b[4] - a[4]) * f, night: h < 6 || h >= 19.5 };
}

// Seeded random so the stars don't jump around on every render.
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
const STARS = [...Array(28)].map(() => [rnd() * 400, rnd() * 120, .5 + rnd() * 1.1, rnd() * 4]);

// Trail: from the bottom left, switchbacks up the middle ridge to the summit at (262, 74).
const TRAIL = 'M 26 246 C 70 236, 96 222, 132 214 S 196 206, 206 188 S 170 160, 204 146 S 248 132, 238 112 S 236 86, 262 74';

export function scene(progress, { h = new Date().getHours() + new Date().getMinutes() / 60 } = {}) {
  const k = skyNow(h), day = h >= 6 && h < 19.5, p = day ? (h - 6) / 13.5 : ((h + 24 - 19.5) % 24) / 10.5;
  const sx = 40 + p * 320, sy = 112 - Math.sin(Math.PI * p) * 86, pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return `<svg class="scene" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true" data-pct="${pct}">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${k.s1}"/><stop offset=".55" stop-color="${k.s2}"/><stop offset="1" stop-color="${k.s3}"/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stop-color="${day ? '#FFF4D6' : '#E8ECFF'}" stop-opacity=".85"/><stop offset="1" stop-color="${day ? '#FFD9A0' : '#9FB0FF'}" stop-opacity="0"/></radialGradient>
      <linearGradient id="r1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ridge-far)"/><stop offset="1" stop-color="var(--ridge-far)" stop-opacity=".2"/></linearGradient>
      <linearGradient id="r2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ridge-mid)"/><stop offset="1" stop-color="var(--ridge-mid)" stop-opacity=".6"/></linearGradient>
    </defs>
    <rect width="400" height="260" fill="url(#sky)"/>
    <g class="stars" style="opacity:${k.stars.toFixed(2)}">${STARS.map(([x, y, r, d]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" style="animation-delay:-${d.toFixed(1)}s"/>`).join('')}</g>
    <g class="sun" style="transform:translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)"><circle r="34" fill="url(#glow)"/><circle r="${day ? 9 : 7}" fill="${day ? '#FFF6E4' : '#F1F3FF'}"/>${day ? '' : '<circle r="6.4" cx="3.4" cy="-2.2" fill="' + k.s1 + '"/>'}</g>
    <g class="clouds"><ellipse class="c1" cx="90" cy="70" rx="46" ry="7"/><ellipse class="c2" cx="300" cy="44" rx="38" ry="5.5"/></g>
    <path class="ridge far" fill="url(#r1)" d="M0 150 L38 128 L70 140 L118 104 L150 122 L196 92 L238 116 L286 86 L330 112 L372 96 L400 108 L400 300 L0 300Z"/>
    <path class="ridge mid" fill="url(#r2)" d="M0 196 L44 170 L92 186 L150 150 L188 162 L262 74 L300 132 L336 120 L400 158 L400 300 L0 300Z"/>
    <path class="snow" d="M262 74 L250 90 L258 88 L263 96 L268 88 L276 92Z"/>
    <path class="trail-base" d="${TRAIL}"/>
    <path class="trail" d="${TRAIL}" pathLength="100" style="--pct:${pct}"/>
    <circle class="hiker" r="5.5"/>
    <g class="flag ${pct >= 100 ? 'up' : ''}" transform="translate(262 74)"><path d="M0 0 V-22" class="pole"/><path d="M0 -22 L15 -17 L0 -12Z" class="cloth"/></g>
    <path class="ridge near" d="M0 232 C40 220, 70 226, 110 218 S 190 214, 240 226 S 330 214, 400 220 L400 300 L0 300Z"/>
  </svg>`;
}

// Puts the hiker at the end of the drawn trail and animates it there from where it was.
let lastPct = 0;
export function mountScene(root) {
  const svg = root.querySelector('.scene'); if (!svg) return;
  const path = svg.querySelector('.trail'), hiker = svg.querySelector('.hiker'), to = +svg.dataset.pct;
  const len = path.getTotalLength(), place = q => { const pt = path.getPointAtLength(len * q / 100); hiker.setAttribute('cx', pt.x); hiker.setAttribute('cy', pt.y); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, from = reduce ? to : lastPct;
  lastPct = to;
  path.style.setProperty('--from', from);
  if (from === to) { place(to); return; }
  const t0 = performance.now(), dur = 900, ease = x => 1 - Math.pow(1 - x, 3);
  const step = t => { const f = Math.min(1, (t - t0) / dur), q = from + (to - from) * ease(f); place(q); if (f < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
