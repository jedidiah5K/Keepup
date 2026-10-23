// A streak card to post in a story or group chat: drawn on a canvas in the current theme,
// shared with the phone's share sheet (or saved as a picture where sharing files isn't possible).
import { state, today, countFor } from '../lib/store.js';
import { addDays } from '../lib/dates.js';
import { COLOURS } from '../lib/theme.js';
import { hiSVG } from './hicons.js';

const W = 1080, H = 1350;

export async function drawCard(h, st) {
  const cs = getComputedStyle(document.documentElement), v = k => cs.getPropertyValue(k).trim();
  const bg = v('--bg') || '#F4F3EF', ink = v('--ink') || '#111', muted = v('--muted') || '#888', col = COLOURS[h.colour] || v('--accent');
  const serif = "'Instrument Serif', Georgia, serif", mono = "'Geist Mono Variable', ui-monospace, monospace", sans = "'Geist Variable', system-ui, sans-serif";
  try { await Promise.all([document.fonts.load(`400 300px ${serif}`), document.fonts.load(`italic 400 80px ${serif}`), document.fonts.load(`500 30px ${mono}`), document.fonts.load(`500 50px ${sans}`)]); } catch (e) {}

  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  // Two ridges at the bottom, the near one in the habit's colour, with the trail climbing it.
  g.globalAlpha = .12; g.fillStyle = ink;
  ridge(g, [[0, 1150], [190, 1060], [330, 1110], [560, 990], [760, 1090], [930, 1030], [1080, 1080]]); g.globalAlpha = 1;
  g.fillStyle = col; ridge(g, [[0, 1250], [240, 1190], [430, 1215], [720, 1090], [880, 1160], [1080, 1130]]);
  g.strokeStyle = bg; g.lineWidth = 6; g.setLineDash([4, 18]); g.lineCap = 'round';
  g.beginPath(); g.moveTo(120, 1350); g.bezierCurveTo(300, 1300, 560, 1270, 720, 1110); g.stroke(); g.setLineDash([]);
  g.fillStyle = bg; g.beginPath(); g.arc(720, 1104, 13, 0, Math.PI * 2); g.fill();
  g.font = `500 26px ${mono}`; g.textAlign = 'right'; spaced(g, location.host.toUpperCase(), W - 84, 1300, 3, true); g.textAlign = 'left';

  // Header
  g.fillStyle = muted; g.font = `500 30px ${mono}`; g.textBaseline = 'alphabetic';
  spaced(g, 'KEEPUP', 84, 130, 6);
  const date = new Date(today() + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  g.textAlign = 'right'; spaced(g, date, W - 84, 130, 4, true); g.textAlign = 'left';

  // The number
  // The unit sits beside a short number, or under a long one.
  const n = String(st.current), unit = st.unit === 'weeks' ? 'week streak' : 'day streak';
  g.fillStyle = ink; g.font = `400 ${n.length > 3 ? 300 : 380}px ${serif}`;
  g.fillText(n, 72, 520);
  const nw = g.measureText(n).width, beside = nw < 560;
  g.fillStyle = col; g.font = `italic 400 84px ${serif}`;
  g.fillText(unit, beside ? 72 + nw + 24 : 84, beside ? 520 : 610);

  // Habit
  g.fillStyle = ink; g.font = `500 54px ${sans}`;
  const svg = hiSVG(h.icon, col);
  if (svg) {
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    try { await img.decode(); g.drawImage(img, 80, 652, 64, 64); } catch (e) {}
    g.fillText(clip(g, h.name, W - 260), 168, 700);
  } else g.fillText(`${h.icon}  ${clip(g, h.name, W - 200)}`, 84, 700);
  g.fillStyle = muted; g.font = `500 30px ${mono}`;
  spaced(g, `BEST ${st.longest} ${st.unit === 'weeks' ? 'WEEKS' : 'DAYS'}`, 84, 760, 3);

  // Last 4 weeks as dots
  const t = today();
  for (let i = 0; i < 28; i++) {
    const d = addDays(t, i - 27), done = countFor(h.id, d) >= h.target_count, x = 84 + (i % 14) * 66 + 24, y = 840 + Math.floor(i / 14) * 66 + 24;
    g.beginPath(); g.arc(x, y, 22, 0, Math.PI * 2);
    if (done) { g.fillStyle = col; g.fill(); } else { g.strokeStyle = muted; g.globalAlpha = .45; g.lineWidth = 3; g.stroke(); g.globalAlpha = 1; }
  }
  return c;
}

function ridge(g, pts) {
  g.beginPath(); g.moveTo(0, H); g.lineTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]);
  g.lineTo(W, H); g.closePath(); g.fill();
}
function spaced(g, s, x, y, gap, right = false) {
  const w = [...s].reduce((a, ch) => a + g.measureText(ch).width + gap, -gap), align = g.textAlign;
  let cx = right ? x - w : x; g.textAlign = 'left';
  for (const ch of s) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + gap; }
  g.textAlign = align;
}
function clip(g, s, max) { if (g.measureText(s).width <= max) return s; while (s.length > 1 && g.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…'; }

export async function shareStreak(h, st) {
  const c = await drawCard(h, st);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const name = `keepup-${h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'streak'}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: `${st.current} ${st.unit === 'weeks' ? 'weeks' : 'days'} of ${h.name} on KeepUp` }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return 'saved';
}
