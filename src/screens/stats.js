// Stats: per-habit completion, streaks, and a calendar heatmap. All free.
import { state, today, activeHabits, countFor, habitById } from '../lib/store.js';
import { addDays, weekOf } from '../lib/dates.js';
import { completion } from '../lib/streaks.js';
import { COLOURS } from '../lib/theme.js';
import { streakOf, dueOn } from './today.js';
import { I } from '../ui/icons.js';
import { esc } from '../ui/sheets.js';

export const view = { habit: null };
const pct = x => Math.round(x * 100) + '%';
const unitOf = (st, n) => st.unit === 'weeks' ? (n === 1 ? 'week' : 'weeks') : (n === 1 ? 'day' : 'days');
const monthStart = d => d.slice(0, 8) + '01';

function heatmap(h, weeks = 18) {
  const t = today(), w0 = addDays(weekOf(t, state.profile.week_start), -7 * (weeks - 1)), col = COLOURS[h.colour];
  const frozen = new Set(streakOf(h).frozen);
  let cells = '';
  for (let w = 0; w < weeks; w++) for (let i = 0; i < 7; i++) {
    const d = addDays(w0, w * 7 + i), c = countFor(h.id, d), lvl = d > t || d < h.start_date ? 'off' : c >= h.target_count ? 'full' : c > 0 ? 'part' : frozen.has(d) ? 'frz' : 'none';
    cells += `<i class="hm-${lvl}" style="grid-column:${w + 1};grid-row:${i + 1};--c:${w + i}" title="${d}${c ? ': ' + c : ''}"></i>`;
  }
  const done = Object.keys(state.checkins[h.id] || {}).filter(d => d >= w0 && countFor(h.id, d) >= h.target_count).length;
  return `<div style="--hc:${col}"><div class="heat" style="--weeks:${weeks}" role="img" aria-label="Done on ${done} days in the last ${weeks} weeks">${cells}</div>
    <div class="legend muted small"><span><i class="hm-none"></i> missed</span><span><i class="hm-part"></i> partly</span><span><i class="hm-full"></i> done</span><span><i class="hm-frz"></i> freeze</span></div></div>`;
}

function detail(h) {
  const t = today(), st = streakOf(h), c = state.checkins[h.id] || {}, start = h.start_date;
  const wk = completion(h, c, [weekOf(t, state.profile.week_start), start].sort()[1], t, state.breaks);
  const mo = completion(h, c, [monthStart(t), start].sort()[1], t, state.breaks);
  const total = Object.values(c).filter(n => n >= h.target_count).length;
  return `<header class="top"><button class="back" data-a="statsBack">${I.left}Stats</button></header>
    <h1 class="h-title"><span aria-hidden="true">${esc(h.icon)}</span> ${esc(h.name)}</h1>
    <div class="tiles">
      <div class="tile"><span class="eyebrow">Current streak</span><b data-count="${st.current}">${st.current}</b><span class="muted">${unitOf(st, st.current)}</span></div>
      <div class="tile"><span class="eyebrow">Longest</span><b data-count="${st.longest}">${st.longest}</b><span class="muted">${unitOf(st, st.longest)}</span></div>
      <div class="tile"><span class="eyebrow">This week</span><b data-count="${Math.round(wk * 100)}" data-suffix="%">${pct(wk)}</b></div>
      <div class="tile"><span class="eyebrow">This month</span><b data-count="${Math.round(mo * 100)}" data-suffix="%">${pct(mo)}</b></div>
    </div>
    <section class="card"><div class="card-h"><span class="eyebrow">Last 18 weeks</span><span class="muted small">${total} check-ins all time</span></div>${heatmap(h)}</section>
    <p class="muted small">Streak freeze: each habit gets 1 a week, used for you on a missed day so one bad day doesn't wipe your streak.</p>
    <div class="row gap"><button class="btn grow" data-a="shareStreak" data-id="${h.id}">${I.share} Share streak</button><button class="btn ghost grow" data-a="editHabit" data-id="${h.id}">Edit habit</button></div>`;
}

// The last 30 days across every habit: one bar per day, how much of the day's list got done.
function overview(hs) {
  const t = today(), daily = hs.filter(h => h.schedule_type !== 'x_per_week');
  const days = [...Array(30)].map((_, i) => addDays(t, i - 29)).map(d => {
    const due = daily.filter(h => dueOn(h, d));
    return { d, p: due.length ? due.filter(h => countFor(h.id, d) >= h.target_count).length / due.length : null };
  });
  const first = hs.reduce((m, h) => h.start_date < m ? h.start_date : m, t), perfect = days.filter(x => x.p === 1).length;
  const checks = hs.reduce((n, h) => n + Object.entries(state.checkins[h.id] || {}).filter(([, c]) => c >= h.target_count).length, 0);
  const best = hs.reduce((m, h) => { const st = streakOf(h); return st.longest > m.n ? { n: st.longest, h } : m; }, { n: 0, h: null });
  return `<section class="ov">
      <div class="ov-nums">
        <div><b data-count="${perfect}">${perfect}</b><span class="muted small">perfect days<br>in the last 30</span></div>
        <div><b data-count="${checks}">${checks}</b><span class="muted small">check-ins<br>all time</span></div>
        <div><b data-count="${best.n}">${best.n}</b><span class="muted small">best streak${best.h ? `<br>${esc(best.h.icon)} ${esc(best.h.name)}` : ''}</span></div>
      </div>
      <div class="ov-bars" role="img" aria-label="${perfect} perfect days in the last 30">${days.map((x, i) => `<i class="${x.p === 1 ? 'full' : ''} ${x.p == null || x.d < first ? 'off' : ''}" style="--p:${x.p ?? 0};--i:${i}" title="${x.d}"></i>`).join('')}</div>
      <div class="ov-axis muted small"><span>30 days ago</span><span>Today</span></div>
    </section>`;
}

export function render() {
  const h = view.habit && habitById(view.habit);
  if (h) return detail(h);
  const t = today(), hs = activeHabits();
  return `<header class="top"><div><div class="eyebrow">Stats</div><h1>Your <em>progress</em></h1></div></header>
    ${hs.length ? overview(hs) : ''}
    ${!hs.length ? '<div class="card empty"><p class="muted">Add a habit and your stats show up here.</p></div>' : `<ul class="slist">${hs.map(h => {
      const st = streakOf(h), c = state.checkins[h.id] || {};
      const wk = completion(h, c, [weekOf(t, state.profile.week_start), h.start_date].sort()[1], t, state.breaks);
      return `<li><button class="srow" data-a="openStats" data-id="${h.id}" style="--hc:${COLOURS[h.colour]}">
        <span class="h-ic" aria-hidden="true">${esc(h.icon)}</span>
        <span class="h-txt"><span class="h-name">${esc(h.name)}</span><span class="muted small">${I.flame} ${st.current} now · best ${st.longest} ${unitOf(st, st.longest)}</span></span>
        <span class="spct"><b>${pct(wk)}</b><span class="muted small">this week</span></span>${I.right}</button></li>`;
    }).join('')}</ul>`}`;
}
