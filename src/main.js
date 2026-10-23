import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './styles.css';
import './ui/dragsort.js';
import { state, load } from './lib/store.js';
import { applyTheme } from './lib/theme.js';
import { I } from './ui/icons.js';
import { closeSheet, toast, openSheet, esc } from './ui/sheets.js';
import * as Today from './screens/today.js';
import * as Stats from './screens/stats.js';
import * as Squad from './screens/squad.js';
import * as Me from './screens/me.js';
import * as Intro from './screens/intro.js';
import { openHabitForm } from './screens/habitForm.js';
import { setCount, habitById } from './lib/store.js';
import { syncLine, loadCloud } from './lib/session.js';
import { install, hideNudge } from './ui/install.js';
const account = () => import('./screens/account.js');

load();
applyTheme(state.profile.theme);

const NAV = { tab: 'today' };
const TABS = [['today', 'Today', I.today], ['squad', 'Squad', I.squad], ['stats', 'Stats', I.stats], ['me', 'Me', I.me]];
const SCREENS = { today: Today, squad: Squad, stats: Stats, me: Me };
const app = document.getElementById('app');

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function render() {
  if (!state.profile.onboarded) { app.innerHTML = `<main id="screen" class="screen intro-screen">${Intro.render()}</main>`; Intro.afterRender?.(app); return; }
  const y = document.getElementById('screen')?.scrollTop || 0, same = render.last === NAV.tab;
  const ti = TABS.findIndex(t => t[0] === NAV.tab);
  app.innerHTML = `<main id="screen" class="screen scr-${NAV.tab}" tabindex="-1">${SCREENS[NAV.tab].render()}</main>
    <nav class="tabs" aria-label="Main" style="--ti:${ti};--from:${render.lastTi ?? ti}"><span class="tab-ind" aria-hidden="true"></span>${TABS.map(([k, l, ic]) => `<button data-a="tab" data-tab="${k}" ${NAV.tab === k ? 'aria-current="page"' : ''}>${ic}<span>${l}</span></button>`).join('')}<button class="fab" data-a="newHabit" aria-label="Add a habit">${I.plus}</button></nav>`;
  const scr = document.getElementById('screen');
  if (same) scr.scrollTop = y; else scr.classList.add('enter');
  render.last = NAV.tab; render.lastTi = ti;
  SCREENS[NAV.tab].afterRender?.(scr);
  if (!same) countUp(scr);
  parallax(scr);
}

// Change screens with a soft cross-fade where the browser supports View Transitions.
function swap(fn) {
  if (!document.startViewTransition || reduceMotion()) { fn(); return; }
  document.startViewTransition(fn);
}

// Headline numbers count up from zero when a screen opens.
function countUp(root) {
  if (reduceMotion()) return;
  root.querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count, t0 = performance.now(), dur = 700, suffix = el.dataset.suffix || '';
    if (!to) return;
    const step = t => { const f = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - f, 3))) + suffix; if (f < 1) requestAnimationFrame(step); };
    el.textContent = '0' + suffix; requestAnimationFrame(step);
  });
}

// The Today scene drifts slower than the page as you scroll, so it feels deep.
function parallax(scr) {
  const hero = scr.querySelector('.hero'); if (!hero || reduceMotion()) return;
  const layers = [['.scene .far', .35], ['.scene .mid', .2], ['.scene .sun', .5], ['.hero-txt', -.25]].map(([q, k]) => [hero.querySelector(q), k]).filter(x => x[0]);
  let raf = 0;
  scr.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { const y = Math.min(scr.scrollTop, 400); layers.forEach(([el, k]) => { el.style.translate = `0 ${(y * k).toFixed(1)}px`; }); hero.style.setProperty('--fade', Math.max(0, 1 - y / 260).toFixed(3)); });
  }, { passive: true });
}

function habitMenu(id) {
  const h = habitById(id); if (!h) return;
  const sh = openSheet(`<h2 class="sheet-h"><span aria-hidden="true">${esc(h.icon)}</span> ${esc(h.name)}</h2>
    <div class="stack"><button class="btn ghost wide" data-m="edit">Edit habit</button><button class="btn ghost wide" data-m="stats">See stats</button></div>`, {
    label: h.name,
    mount: b => b.onclick = e => {
      const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return; closeSheet(sh);
      if (m === 'edit') openHabitForm(id, render);
      if (m === 'stats') { NAV.tab = 'stats'; Stats.view.habit = id; render(); }
    },
  });
}

const ACTIONS = {
  tab: el => { if (NAV.tab === el.dataset.tab && NAV.tab !== 'stats') return; swap(() => { NAV.tab = el.dataset.tab; if (NAV.tab === 'stats') Stats.view.habit = null; render(); document.getElementById('screen').scrollTop = 0; }); },
  pickDay: el => { Today.view.day = el.dataset.d; render(); },
  tick: el => Today.tick(el, render),
  undoTick: el => { setCount(el.dataset.id, el.dataset.d, +el.dataset.c); document.querySelector('.toast')?.remove(); render(); },
  newHabit: () => openHabitForm(null, render),
  editHabit: el => openHabitForm(el.dataset.id, render),
  habitMenu: el => habitMenu(el.dataset.id),
  openStats: el => swap(() => { Stats.view.habit = el.dataset.id; render.last = null; render(); document.getElementById('screen').scrollTop = 0; }),
  statsBack: () => swap(() => { Stats.view.habit = null; render.last = null; render(); }),
  closeSheet: () => closeSheet(),
  auth: async el => (await account()).openAuth(el.dataset.mode),
  signOut: async () => (await account()).confirmSignOut(),
  syncNow: async () => (await loadCloud()).sync(),
  install: () => install(),
  hideInstall: el => { hideNudge(); const c = el.closest('.install-card'); c.classList.add('bye'); setTimeout(render, 280); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const a = el.dataset.a;
  if (a.startsWith('ob') && ACTIONS[a] === undefined) { const go = Intro.handle(a, el); go ? swap(render) : render(); return; }
  if (ACTIONS[a]) return ACTIONS[a](el);
  if (['theme', 'manage', 'export'].includes(a)) Me.handle(a, el, render);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  if (['pref', 'weekstart', 'evening', 'name'].includes(el.dataset.a)) Me.handle(el.dataset.a, el, render);
});
// A new day while the app is open: move Today along.
let lastDay = null;
setInterval(() => { const d = Today.view.day ?? null; const t = new Date().toDateString(); if (lastDay && t !== lastDay && !d) render(); lastDay = t; }, 60e3);

// Icon-only buttons get a tooltip from their label (from JobDone).
document.addEventListener('pointerover', e => { const b = e.target.closest('button[aria-label]:not([title])'); if (b && !b.textContent.trim()) b.title = b.getAttribute('aria-label'); });

render();
// Accounts and sync load just after the first screen is up, so opening the app stays instant.
const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
idle(() => loadCloud().then(m => {
  m.start();
  // Coming back from a reset-password email: ask for the new password.
  m.sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') account().then(a => a.openAuth('newpw')); });
}));
// Data came down from the account: redraw, unless the person is mid-typing or in a sheet.
addEventListener('keepup:cloud', () => {
  applyTheme(state.profile.theme);
  const a = document.activeElement;
  if (document.querySelector('.sheet-wrap') || (a && /INPUT|SELECT|TEXTAREA/.test(a.tagName))) { const l = document.querySelector('.sync-line'); if (l) l.textContent = syncLine(); return; }
  render();
});
addEventListener('keepup:installable', () => render());
if ('serviceWorker' in navigator && import.meta.env.PROD) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
window.KeepUp = { state, render, toast };
