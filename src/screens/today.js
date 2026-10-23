// Today: week strip, this week's summary, and one big tick per habit.
import { state, today, activeHabits, countFor, setCount, editable } from '../lib/store.js';
import { addDays, weekOf, isoWeekday } from '../lib/dates.js';
import { habitStreak } from '../lib/streaks.js';
import { COLOURS, inkOn } from '../lib/theme.js';
import { I } from '../ui/icons.js';
import { esc, toast } from '../ui/sheets.js';
import { buzz, SOUNDS, burst, confetti } from '../ui/feedback.js';
import { scene, mountScene } from '../ui/scene.js';
import { canInstall, nudgeHidden, isIOS } from '../ui/install.js';

export const view = { day: null, just: null }; // day null = today; just = habit id ticked a moment ago

const DOW = ['', 'M', 'T', 'W', 'T', 'F', 'S', 'S'];
const fmtDay = d => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

// Is the habit on the list for this day? "X a week" habits show every day.
export const dueOn = (h, d) => d >= h.start_date && (h.schedule_type !== 'weekdays' || h.schedule_days.includes(isoWeekday(d)));
export const streakOf = (h, upTo = today()) => habitStreak({ ...h, start: h.start_date }, state.checkins[h.id] || {}, { today: upTo, weekStart: state.profile.week_start, freezesPerWeek: 1 });

function dayProgress(d) {
  const hs = activeHabits().filter(h => dueOn(h, d) && h.schedule_type !== 'x_per_week');
  if (!hs.length) return null;
  return hs.filter(h => countFor(h.id, d) >= h.target_count).length / hs.length;
}

let lastSel = null;
function weekStrip(sel) {
  const t = today(), w0 = weekOf(sel, state.profile.week_start), idx = (isoWeekday(sel) - state.profile.week_start + 7) % 7;
  const from = lastSel ?? idx; lastSel = idx;
  return `<div class="week" role="tablist" aria-label="This week" style="--sel:${idx};--from:${from}"><span class="week-ind" aria-hidden="true"></span>${[...Array(7)].map((_, i) => {
    const d = addDays(w0, i), p = dayProgress(d), fut = d > t;
    const ring = p == null || fut ? '' : `<svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-bg" cx="18" cy="18" r="16"/>${p ? `<circle class="ring-fg" cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="${Math.round(p * 100)} 100"/>` : ''}</svg>`;
    return `<button class="day ${d === sel ? 'sel' : ''} ${d === t ? 'now' : ''} ${p === 1 ? 'full' : ''}" role="tab" aria-selected="${d === sel}" ${fut ? 'disabled' : ''}
      data-a="pickDay" data-d="${d}" aria-label="${fmtDay(d)}${p != null && !fut ? ', ' + Math.round(p * 100) + '% done' : ''}">
      <span class="dow">${DOW[isoWeekday(d)]}</span><span class="dn">${ring}<span>${+d.slice(8)}</span></span></button>`;
  }).join('')}</div>`;
}

function weekSummary() {
  const t = today(), w0 = weekOf(t, state.profile.week_start);
  let due = 0, done = 0;
  for (const h of activeHabits()) {
    if (h.schedule_type === 'x_per_week') { due += h.times_per_week; let n = 0; for (let i = 0; i < 7; i++) { const d = addDays(w0, i); if (d <= t && countFor(h.id, d) >= h.target_count) n++; } done += Math.min(n, h.times_per_week); continue; }
    for (let i = 0; i < 7; i++) { const d = addDays(w0, i); if (dueOn(h, d)) { due++; if (d <= t && countFor(h.id, d) >= h.target_count) done++; } }
  }
  if (!due) return '';
  const p = done / due;
  return `<button class="wsum" data-a="tab" data-tab="stats" aria-label="This week: ${done} of ${due} done. Open stats.">
    <span class="eyebrow">This week</span><span class="wbar" aria-hidden="true"><i style="--w:${Math.round(p * 100)}%"></i></span><span class="wnum">${Math.round(p * 100)}%</span></button>`;
}

// A number whose digits roll up when it changes.
const roll = (n, on) => `<span class="roll ${on ? 'go' : ''}" aria-hidden="true">${String(n).split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</span>`;

function habitRow(h, d, i) {
  const c = countFor(h.id, d), done = c >= h.target_count, col = COLOURS[h.colour] || COLOURS.tangerine;
  const st = streakOf(h, d), lock = !editable(d), just = view.just === h.id;
  const frozenNow = st.frozen.length && st.frozen[st.frozen.length - 1] >= addDays(d, -6);
  const unit = st.unit === 'weeks' ? (st.current === 1 ? 'wk' : 'wks') : (st.current === 1 ? 'day' : 'days');
  const sub = h.schedule_type === 'x_per_week' ? `${st.weekDone} of ${st.weekTarget} this week` : h.kind === 'count' ? `${c} of ${h.target_count}` : h.schedule_type === 'weekdays' ? 'Some days' : 'Every day';
  // Lost a streak? Most people quit right here. Say something kind and keep their best on show.
  const comeback = !st.current && st.longest >= 3 && h.schedule_type !== 'x_per_week' && !c;
  const pct = n => Math.round(Math.min(1, n / h.target_count) * 100), pc = h.kind === 'count' ? pct(c) : 0, pp = just && view.justFrom != null ? pct(view.justFrom) : pc;
  const label = `${h.name}: ${done ? 'done' : h.kind === 'count' ? `${c} of ${h.target_count}, tap to add one` : 'not done, tap to tick'}`;
  return `<li class="habit ${done ? 'done' : ''} ${just ? 'just' : ''}" style="--hc:${col};--hink:${inkOn(col)};--i:${i}" data-id="${h.id}">
    <button class="h-main" data-a="habitMenu" data-id="${h.id}" aria-label="${esc(h.name)} options">
      <span class="h-ic" aria-hidden="true">${esc(h.icon)}</span>
      <span class="h-txt"><span class="h-name"><span>${esc(h.name)}</span></span><span class="h-meta">${comeback ? `Fresh start · best ${st.longest}` : esc(sub)}</span></span>
    </button>
    <span class="h-streak ${frozenNow ? 'frozen' : ''} ${st.current ? '' : 'zero'}" aria-label="Streak ${st.current} ${unit}${frozenNow ? ', saved by a freeze' : ''}">${frozenNow ? I.snow : I.flame}${roll(st.current, just && done)}<small>${unit}</small></span>
    <button class="tick ${h.kind === 'count' ? 'count' : ''}" data-a="tick" data-id="${h.id}" data-d="${d}" aria-label="${esc(label)}" aria-pressed="${done}" ${lock ? 'disabled' : ''} style="--pc:${pc};--pp:${pp}">
      ${h.kind === 'count' ? `<svg class="cring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20" pathLength="100"/></svg>` : ''}
      <span class="tick-fill" aria-hidden="true"></span>
      <svg class="tick-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2L18.5 7.8" pathLength="1"/></svg>
      ${h.kind === 'count' && !done ? `<b class="tick-n">${c}</b>` : ''}
    </button>
  </li>`;
}

const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Late night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night'; };

export function render() {
  const t = today(), d = view.day && view.day <= t ? view.day : t;
  const hs = activeHabits(), list = hs.filter(h => dueOn(h, d));
  // "X a week" habits show every day but don't have to be ticked every day.
  const daily = list.filter(h => h.schedule_type !== 'x_per_week');
  const doneN = daily.filter(h => countFor(h.id, d) >= h.target_count).length;
  const doneAll = daily.length && doneN === daily.length;
  const name = (state.profile.display_name || '').split(/\s+/)[0];
  const isToday = d === t;
  return `<section class="hero ${doneAll ? 'summit' : ''}">
      ${scene(daily.length ? doneN / daily.length : 0)}
      <div class="hero-top"><span class="eyebrow on-sky">${isToday ? fmtDay(t) : 'Looking back'}</span>
        ${!isToday ? `<button class="chip glass" data-a="pickDay" data-d="${t}">Today</button>` : ''}</div>
      <div class="hero-txt">
        <h1 class="display on-sky">${isToday ? `${greet()}${name ? `, <em>${esc(name)}</em>` : ''}` : esc(fmtDay(d))}</h1>
        ${daily.length ? `<p class="hero-n on-sky"><b data-count="${doneN}">${doneN}</b><span>/${daily.length}</span> ${doneAll ? '<em>summit reached</em>' : 'done'}</p>` : ''}
      </div>
    </section>
    <div class="sheet-top">
      ${weekStrip(d)}
      ${!editable(d) ? `<p class="note">${I.lock}<span>Days more than a week ago are locked, so streaks stay honest.</span></p>` : ''}
      ${!hs.length ? `<div class="empty"><h2 class="display">Start with <em>one</em> habit.</h2>
          <p class="muted">Small and daily beats big and rare. Add as many as you like, free, always.</p>
          <button class="btn mt3" data-a="newHabit">${I.plus} Add a habit</button></div>`
        : !list.length ? `<div class="empty"><p class="muted">Nothing scheduled for this day. Enjoy the rest.</p></div>`
        : `<ul class="habits" aria-label="Habits for ${fmtDay(d)}">${list.map((h, i) => habitRow(h, d, i)).join('')}</ul>`}
      ${isToday ? weekSummary() : ''}
      ${isToday && hs.length && canInstall() && !nudgeHidden() ? installCard() : ''}
    </div>
`;
}

// While in beta, KeepUp is installed from the browser. A quiet card, not a pop-up.
const installCard = () => `<aside class="install-card">
    <img src="/icons/icon-192.png" alt="" width="44" height="44">
    <div class="grow"><b>Keep it one tap away</b><span class="muted small">${isIOS() ? 'Add KeepUp to your home screen. Opens full screen, works offline.' : 'Install KeepUp. Opens like an app, works offline.'}</span></div>
    <button class="btn sm" data-a="install">Add</button>
    <button class="x" data-a="hideInstall" aria-label="Not now">×</button>
  </aside>`;

export function afterRender(root) { mountScene(root); view.just = null; }

// Tap: yes/no flips, count adds one (and wraps back to 0 after the target, so a slip is fixable).
export function tick(btn, rerender) {
  const id = btn.dataset.id, d = btn.dataset.d, h = state.habits.find(x => x.id === id); if (!h) return;
  const c = countFor(id, d), wasDone = c >= h.target_count;
  const next = h.kind === 'count' ? (wasDone ? 0 : c + 1) : (wasDone ? 0 : 1);
  const hsBefore = activeHabits().filter(x => dueOn(x, d) && x.schedule_type !== 'x_per_week'), allBefore = hsBefore.every(x => countFor(x.id, d) >= x.target_count);
  if (!setCount(id, d, next)) return;
  const nowDone = next >= h.target_count;
  if (nowDone && !wasDone) {
    buzz(14); setTimeout(() => burst(document.querySelector(`.habit[data-id="${id}"] .tick`), COLOURS[h.colour]), 60);
    const all = hsBefore.length && hsBefore.every(x => countFor(x.id, d) >= x.target_count);
    if (all && !allBefore) { setTimeout(() => { SOUNDS.allDone(); confetti(36); buzz(30); }, 700); SOUNDS.pop(); } else SOUNDS.pop();
  } else if (next > c) { SOUNDS.plus(); buzz(8); }
  else { SOUNDS.undo(); buzz(8); toast(`Unticked ${esc(h.name)} · <button class="link" data-a="undoTick" data-id="${id}" data-d="${d}" data-c="${c}">Undo</button>`); }
  view.just = id; view.justFrom = c;
  rerender();
  if (nowDone && !wasDone) { const el = document.querySelector(`.habit[data-id="${id}"] .tick`); el?.focus({ preventScroll: true }); }
}
