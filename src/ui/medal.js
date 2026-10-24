// Trophy medals, drawn as small SVGs in the theme's colours. Locked ones are a faint dashed outline.
import { TROPHIES, earned } from '../lib/trophies.js';
import { state, today } from '../lib/store.js';
import { streakOf, dueOn } from '../screens/today.js';
import { SOUNDS, buzz, confetti } from './feedback.js';

const TINT = { streak: 'var(--accent)', total: 'var(--ink)', perfect: 'var(--done)', week: 'var(--done)', comeback: 'var(--freeze)', squad: '#7B4BC4' };
const short = n => n >= 1000 ? `${n / 1000}k` : String(n);

function glyph(t, ink) {
  if (t.kind === 'streak' || t.kind === 'total') {
    const s = short(t.n), size = s.length > 2 ? 17 : 21;
    return `<text x="32" y="${t.kind === 'total' ? 37 : 42}" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="${size}" fill="${ink}">${s}</text>
      ${t.kind === 'total' ? `<path d="M25 43h14" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`
        : `<path transform="translate(32 18) scale(.62) translate(-32 -20)" d="M32 11c1.6 3.5-.3 5.4-1.9 7.2-1.6 1.8-2.7 3.4-2.7 5.7 0 2.8 2 4.9 4.6 4.9s4.6-2.1 4.6-4.9c0-1.9-.8-3.5-1.9-4.6-.1 1.2-.8 2.2-1.8 2.6.5-3.5-.1-7.2-.9-10.9z" fill="${ink}" opacity=".85"/>`}`;
  }
  if (t.kind === 'perfect') return `<path d="M22 33l7 7 13-15" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (t.kind === 'week') return [...Array(7)].map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 7; return `<circle cx="${32 + Math.cos(a) * 11}" cy="${32 + Math.sin(a) * 11}" r="3" fill="${ink}"/>`; }).join('');
  if (t.kind === 'comeback') return `<path d="M41 27a10 10 0 1 0 1 9" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/><path d="M42 20v8h-8" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<circle cx="25" cy="34" r="6" fill="none" stroke="${ink}" stroke-width="2.4"/><circle cx="39" cy="34" r="6" fill="none" stroke="${ink}" stroke-width="2.4"/><circle cx="32" cy="24" r="6" fill="none" stroke="${ink}" stroke-width="2.4"/>`;
}

export function medal(t, on, size = 64) {
  const tint = TINT[t.kind], ink = !on ? 'var(--muted)' : t.kind === 'total' ? 'var(--bg)' : '#fff';
  // Scalloped edge, like a pressed metal badge: 24 bumps around the rim.
  const rim = [...Array(48)].map((_, i) => { const a = i * Math.PI / 24, r = i % 2 ? 27.5 : 30; return `${(32 + Math.cos(a) * r).toFixed(2)},${(32 + Math.sin(a) * r).toFixed(2)}`; }).join(' ');
  return `<svg class="medal ${on ? 'on' : ''}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" style="--mt:${tint}">
    ${on ? `<polygon points="${rim}" fill="${tint}"/><circle cx="32" cy="32" r="22.5" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="1"/>`
      : `<circle cx="32" cy="32" r="27" fill="none" stroke="var(--line-2)" stroke-width="1.5" stroke-dasharray="3 4"/>`}
    <g opacity="1">${glyph(t, ink)}</g></svg>`;
}

const inSquad = () => { try { return localStorage.getItem('keepup:insquad') === '1'; } catch (e) { return false; } };
export function myTrophies() {
  const streaks = Object.fromEntries(state.habits.map(h => [h.id, streakOf(h)]));
  return earned(state.habits, state.checkins, streaks, { today: today(), weekStart: state.profile.week_start, dueOn, inSquad: inSquad() });
}

// After a tick: anything new since last time gets its own small moment. First run just remembers.
const SEEN = 'keepup:trophies';
export function checkNew(delay = 1400) {
  const got = myTrophies();
  let seen = null; try { seen = JSON.parse(localStorage.getItem(SEEN) || 'null'); } catch (e) {}
  try { localStorage.setItem(SEEN, JSON.stringify([...got])); } catch (e) {}
  if (!seen) return;
  const fresh = TROPHIES.filter(t => got.has(t.id) && !seen.includes(t.id));
  if (!fresh.length) return;
  const t = fresh[fresh.length - 1];
  setTimeout(() => {
    const el = document.createElement('div'); el.className = 'trophy-pop'; el.setAttribute('role', 'status');
    el.innerHTML = `${medal(t, true, 56)}<span><small>New trophy</small><b>${t.name}</b></span>`;
    document.body.appendChild(el); SOUNDS.milestone(); buzz(30); confetti(24);
    el.addEventListener('click', () => el.remove());
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 3200);
  }, delay);
}
