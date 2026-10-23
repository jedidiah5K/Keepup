import '@fontsource-variable/inter';
import '@fontsource-variable/bricolage-grotesque';
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

load();
applyTheme(state.profile.theme);

const NAV = { tab: 'today' };
const TABS = [['today', 'Today', I.today], ['squad', 'Squad', I.squad], ['stats', 'Stats', I.stats], ['me', 'Me', I.me]];
const SCREENS = { today: Today, squad: Squad, stats: Stats, me: Me };
const app = document.getElementById('app');

function render() {
  if (!state.profile.onboarded) { app.innerHTML = `<main id="screen" class="screen">${Intro.render()}</main>`; return; }
  const y = document.getElementById('screen')?.scrollTop || 0, same = render.last === NAV.tab;
  app.innerHTML = `<main id="screen" class="screen" tabindex="-1">${SCREENS[NAV.tab].render()}</main>
    <nav class="tabs" aria-label="Main">${TABS.map(([k, l, ic]) => `<button data-a="tab" data-tab="${k}" ${NAV.tab === k ? 'aria-current="page"' : ''}>${ic}<span>${l}</span></button>`).join('')}</nav>`;
  if (same) document.getElementById('screen').scrollTop = y;
  render.last = NAV.tab;
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
  tab: el => { NAV.tab = el.dataset.tab; if (NAV.tab === 'stats') Stats.view.habit = null; render(); document.getElementById('screen').scrollTop = 0; },
  pickDay: el => { Today.view.day = el.dataset.d; render(); },
  tick: el => Today.tick(el, render),
  undoTick: el => { setCount(el.dataset.id, el.dataset.d, +el.dataset.c); document.querySelector('.toast')?.remove(); render(); },
  newHabit: () => openHabitForm(null, render),
  editHabit: el => openHabitForm(el.dataset.id, render),
  habitMenu: el => habitMenu(el.dataset.id),
  openStats: el => { Stats.view.habit = el.dataset.id; render(); document.getElementById('screen').scrollTop = 0; },
  statsBack: () => { Stats.view.habit = null; render(); },
  closeSheet: () => closeSheet(),
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const a = el.dataset.a;
  if (a.startsWith('ob')) { Intro.handle(a, el); render(); return; }
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
if ('serviceWorker' in navigator && import.meta.env.PROD) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
window.KeepUp = { state, render, toast };
