// Today: week strip, this week's summary, and one big tick per habit.
import { state, today, activeHabits, countFor, setCount, editable } from '../lib/store.js';
import { addDays, weekOf, isoWeekday } from '../lib/dates.js';
import { habitStreak } from '../lib/streaks.js';
import { COLOURS, inkOn } from '../lib/theme.js';
import { I } from '../ui/icons.js';
import { esc, toast } from '../ui/sheets.js';
import { buzz, SOUNDS, burst, confetti } from '../ui/feedback.js';

export const view = { day: null }; // null = today

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

function weekStrip(sel) {
  const t = today(), w0 = weekOf(sel, state.profile.week_start);
  return `<div class="week" role="tablist" aria-label="This week">${[...Array(7)].map((_, i) => {
    const d = addDays(w0, i), p = dayProgress(d), fut = d > t;
    const ring = p == null || fut || p === 0 ? '' : `<svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5" pathLength="100" stroke-dasharray="${Math.round(p * 100)} 100"/></svg>`;
    return `<button class="day ${d === sel ? 'sel' : ''} ${d === t ? 'now' : ''}" role="tab" aria-selected="${d === sel}" ${fut ? 'disabled' : ''}
      data-a="pickDay" data-d="${d}" aria-label="${fmtDay(d)}${p != null ? ', ' + Math.round(p * 100) + '% done' : ''}">
      <span class="dow">${DOW[isoWeekday(d)]}</span><span class="dn">${+d.slice(8)}${ring}</span></button>`;
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
  return `<button class="card summary" data-a="tab" data-tab="stats" aria-label="This week: ${done} of ${due} done. Open stats.">
    <div class="sum-top"><span class="eyebrow">This week</span><span class="sum-n"><b>${done}</b>/${due}</span></div>
    <div class="bar" aria-hidden="true"><i style="width:${Math.round(p * 100)}%"></i></div></button>`;
}

function habitRow(h, d) {
  const c = countFor(h.id, d), done = c >= h.target_count, col = COLOURS[h.colour] || COLOURS.tangerine;
  const st = streakOf(h, d), lock = !editable(d);
  const frozenNow = st.frozen.length && st.frozen[st.frozen.length - 1] >= addDays(d, -6);
  const unit = st.unit === 'weeks' ? (st.current === 1 ? 'week' : 'weeks') : (st.current === 1 ? 'day' : 'days');
  const sub = h.schedule_type === 'x_per_week' ? `${st.weekDone}/${st.weekTarget} this week` : h.kind === 'count' ? `${c}/${h.target_count}` : '';
  const ring = h.kind === 'count' && !done ? `<svg class="cring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5" pathLength="100" stroke-dasharray="${Math.round(c / h.target_count * 100)} 100"/></svg>` : '';
  const label = `${h.name}: ${done ? 'done' : h.kind === 'count' ? `${c} of ${h.target_count}, tap to add one` : 'not done, tap to tick'}`;
  return `<li class="habit ${done ? 'done' : ''}" style="--hc:${col};--hink:${inkOn(col)}" data-id="${h.id}">
    <button class="h-main" data-a="habitMenu" data-id="${h.id}" aria-label="${esc(h.name)} options">
      <span class="h-ic" aria-hidden="true">${esc(h.icon)}</span>
      <span class="h-txt"><span class="h-name">${esc(h.name)}</span>
        <span class="h-meta">${st.current ? `<span class="streak ${frozenNow ? 'frozen' : ''}">${frozenNow ? I.snow : I.flame}${st.current} ${unit}</span>` : '<span class="streak none">No streak yet</span>'}${sub ? `<span class="dot">·</span><span>${sub}</span>` : ''}</span></span>
    </button>
    <button class="tick" data-a="tick" data-id="${h.id}" data-d="${d}" aria-label="${esc(label)}" aria-pressed="${done}" ${lock ? 'disabled' : ''}>
      ${ring}<span class="tick-in">${done ? I.check : h.kind === 'count' ? `<b>${c}</b>` : ''}</span></button>
  </li>`;
}

export function render() {
  const t = today(), d = view.day && view.day <= t ? view.day : t;
  const hs = activeHabits(), list = hs.filter(h => dueOn(h, d));
  // "X a week" habits show every day but don't have to be ticked every day.
  const daily = list.filter(h => h.schedule_type !== 'x_per_week');
  const doneAll = daily.length && daily.every(h => countFor(h.id, d) >= h.target_count);
  const name = (state.profile.display_name || '').split(/\s+/)[0];
  const head = d === t ? (name ? `Hey ${esc(name)}` : 'Today') : fmtDay(d);
  return `<header class="top"><div><div class="eyebrow">${d === t ? fmtDay(t) : 'Looking back'}</div><h1>${head}</h1></div>
      ${d !== t ? `<button class="chip" data-a="pickDay" data-d="${t}">Back to today</button>` : ''}</header>
    ${weekStrip(d)}
    ${!editable(d) ? `<p class="note">${I.lock}<span>Days more than a week ago are locked, so streaks stay honest.</span></p>` : ''}
    ${d === t ? weekSummary() : ''}
    ${!hs.length ? `<div class="empty card"><div class="big-emoji" aria-hidden="true">🌱</div><h2>Start with one habit</h2>
        <p class="muted">Small and daily beats big and rare. You can add as many as you like. It's free, always.</p>
        <button class="btn mt3" data-a="newHabit">${I.plus} Add a habit</button></div>`
      : !list.length ? `<div class="empty card"><p class="muted">Nothing scheduled for this day. Enjoy the rest.</p></div>`
      : `<ul class="habits" aria-label="Habits for ${fmtDay(d)}">${list.map(h => habitRow(h, d)).join('')}</ul>`}
    ${doneAll ? `<div class="card alldone" role="status"><span class="big-emoji" aria-hidden="true">🎉</span><div><b>All done ${d === t ? 'today' : 'that day'}!</b><div class="muted">${d === t ? 'See you tomorrow.' : 'Nice save.'}</div></div></div>` : ''}
    <button class="fab" data-a="newHabit" aria-label="Add a habit" title="Add a habit">${I.plus}</button>`;
}

// Tap: yes/no flips, count adds one (and wraps back to 0 after the target, so a slip is fixable).
export function tick(btn, rerender) {
  const id = btn.dataset.id, d = btn.dataset.d, h = state.habits.find(x => x.id === id); if (!h) return;
  const c = countFor(id, d), wasDone = c >= h.target_count;
  const next = h.kind === 'count' ? (wasDone ? 0 : c + 1) : (wasDone ? 0 : 1);
  const hsBefore = activeHabits().filter(x => dueOn(x, d) && x.schedule_type !== 'x_per_week'), allBefore = hsBefore.every(x => countFor(x.id, d) >= x.target_count);
  if (!setCount(id, d, next)) return;
  const nowDone = next >= h.target_count;
  if (nowDone && !wasDone) {
    burst(btn, COLOURS[h.colour]); buzz(14);
    const all = hsBefore.length && hsBefore.every(x => countFor(x.id, d) >= x.target_count);
    if (all && !allBefore) { setTimeout(() => { SOUNDS.allDone(); confetti(36); buzz(30); }, 120); } else SOUNDS.pop();
  } else if (next > c) { SOUNDS.plus(); buzz(8); }
  else { SOUNDS.undo(); buzz(8); toast(`Unticked ${esc(h.name)} · <button class="link" data-a="undoTick" data-id="${id}" data-d="${d}" data-c="${c}">Undo</button>`); }
  rerender();
  const el = document.querySelector(`.habit[data-id="${id}"] .tick`); if (el && nowDone && !wasDone) { el.classList.add('pop'); el.focus({ preventScroll: true }); }
}
