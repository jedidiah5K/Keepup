// Today: week strip, this week's summary, and one big tick per habit.
import { hi } from '../ui/hicons.js';
import { state, today, activeHabits, countFor, setCount, editable, currentBreak, isSkipped } from '../lib/store.js';
import { addDays, weekOf, isoWeekday } from '../lib/dates.js';
import { habitStreak } from '../lib/streaks.js';
import { COLOURS, inkOn } from '../lib/theme.js';
import { I } from '../ui/icons.js';
import { esc, toast } from '../ui/sheets.js';
import { buzz, SOUNDS, burst, confetti, celebrate, MILESTONES } from '../ui/feedback.js';
import { scene, mountScene } from '../ui/scene.js';
import { canInstall, nudgeHidden, isIOS } from '../ui/install.js';
import { checkNew } from '../ui/medal.js';

export const view = { day: null, just: null }; // day null = today; just = habit id ticked a moment ago

const DOW = ['', 'M', 'T', 'W', 'T', 'F', 'S', 'S'];
const fmtDay = d => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

// Is the habit on the list for this day? "X a week" habits show every day.
// Due, and not skipped: what the day's progress is measured against.
export const owed = (h, d) => dueOn(h, d) && !isSkipped(h.id, d);
export const dueOn = (h, d) => d >= h.start_date && (!h.end_date || d <= h.end_date) && (h.schedule_type !== 'weekdays' || h.schedule_days.includes(isoWeekday(d)));
// One list, or (when any habit has a part of the day) Morning / Afternoon / Evening / Any time.
const PARTS = [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening'], [null, 'Any time']];
const partNow = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };
function habitLists(list, d) {
  const ul = (hs, start, label) => `<ul class="habits ${firstRun() && !start ? 'coach' : ''}" aria-label="${esc(label)}">${hs.map((h, i) => habitRow(h, d, start + i)).join('')}</ul>`;
  if (!list.some(h => h.time_of_day)) return ul(list, 0, `Habits for ${fmtDay(d)}`);
  let n = 0;
  return PARTS.map(([k, name]) => {
    const hs = list.filter(h => (h.time_of_day || null) === k); if (!hs.length) return '';
    const now = d === today() && k === partNow(), left = hs.filter(h => !isSkipped(h.id, d) && countFor(h.id, d) < h.target_count).length;
    const pop = !left && view.partDone === (k || 'any') ? 'pop' : '';
    const out = `<h3 class="tod ${now ? 'now' : ''} ${left || hs.every(h => isSkipped(h.id, d)) ? '' : 'all'} ${pop}"><span>${name}</span><small>${left ? `${left} to go` : hs.every(h => isSkipped(h.id, d)) ? 'skipped' : `${I.check} done`}</small></h3>${ul(hs, n, `${name} habits`)}`;
    n += hs.length; return out;
  }).join('');
}

// Habits with an end date (an assignment, an exam): count down to it.
export function dueLine(h, d = today()) {
  if (!h.end_date || d > h.end_date) return '';
  const n = Math.round((new Date(h.end_date + 'T12:00') - new Date(d + 'T12:00')) / 864e5);
  return n === 0 ? 'Due today' : n === 1 ? 'Due tomorrow' : n < 7 ? `Due in ${n} days` : `Due ${new Date(h.end_date + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}
export const streakOf = (h, upTo = today()) => habitStreak({ ...h, start: h.start_date }, state.checkins[h.id] || {}, { today: h.end_date && h.end_date < upTo ? h.end_date : upTo, weekStart: state.profile.week_start, freezesPerWeek: 1, breaks: state.breaks });

// How many of today's habits are still open (for the home-screen badge).
export function leftToday() {
  const t = today(); if (currentBreak(t)) return 0;
  return activeHabits().filter(h => owed(h, t) && h.schedule_type !== 'x_per_week' && countFor(h.id, t) < h.target_count).length;
}

function dayProgress(d) {
  const hs = activeHabits().filter(h => owed(h, d) && h.schedule_type !== 'x_per_week');
  if (!hs.length) return null;
  return hs.filter(h => countFor(h.id, d) >= h.target_count).length / hs.length;
}

let lastSel = null, slide = '';
function weekStrip(sel) {
  const t = today(), w0 = weekOf(sel, state.profile.week_start), idx = (isoWeekday(sel) - state.profile.week_start + 7) % 7;
  const from = lastSel ?? idx; lastSel = idx;
  const cls = slide; slide = '';
  return `<div class="week ${cls}" role="tablist" aria-label="This week" style="--sel:${idx};--from:${from}"><span class="week-ind" aria-hidden="true"></span>${[...Array(7)].map((_, i) => {
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
    for (let i = 0; i < 7; i++) { const d = addDays(w0, i); if (owed(h, d)) { due++; if (d <= t && countFor(h.id, d) >= h.target_count) done++; } }
  }
  if (!due) return '';
  const p = done / due;
  return `<button class="wsum" data-a="tab" data-tab="stats" aria-label="This week: ${done} of ${due} done. Open stats.">
    <span class="eyebrow">This week</span><span class="wbar" aria-hidden="true"><i style="--w:${Math.round(p * 100)}%"></i></span><span class="wnum">${Math.round(p * 100)}%</span></button>`;
}

// A number whose digits roll up when it changes.
const roll = (n, on) => `<span class="roll ${on ? 'go' : ''}" aria-hidden="true">${String(n).split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</span>`;

function habitRow(h, d, i) {
  const c = countFor(h.id, d), done = c >= h.target_count, skip = isSkipped(h.id, d), col = COLOURS[h.colour] || COLOURS.tangerine;
  const st = streakOf(h, d), lock = !editable(d), just = view.just === h.id;
  const frozenNow = st.current > 0 && st.frozen.length && st.frozen[st.frozen.length - 1] >= addDays(d, -6);
  const unit = st.unit === 'weeks' ? (st.current === 1 ? 'wk' : 'wks') : (st.current === 1 ? 'day' : 'days');
  const base = h.schedule_type === 'x_per_week' ? `${st.weekDone} of ${st.weekTarget} this week` : h.kind === 'count' ? `${c} of ${h.target_count}` : h.schedule_type === 'weekdays' ? 'Some days' : 'Every day';
  const plain = h.schedule_type !== 'x_per_week' && h.kind !== 'count', extra = dueLine(h, d) || (!done && h.cue) || '';
  const due = dueLine(h, d), sub = extra ? (plain ? extra : `${base} · ${extra}`) : base;
  // Lost a streak? Most people quit right here. Say something kind and keep their best on show.
  const comeback = !st.current && st.longest >= 3 && h.schedule_type !== 'x_per_week' && !c;
  // Evening, streak going, not done yet: say what's at stake.
  // A streak broken in the last day or two can be won back: say exactly what it takes.
  const rp = d === today() && st.repair, rpLine = rp && (rp.done && done ? `Tomorrow wins back ${rp.was} days` : rp.done || done ? `Today wins back ${rp.was} days` : `2 ticks win back ${rp.was} days`);
  const atRisk = !done && !skip && st.current >= 3 && d === today() && !currentBreak(d) && h.schedule_type !== 'x_per_week' && new Date().getHours() >= 18;
  const pct = n => Math.round(Math.min(1, n / h.target_count) * 100), pc = h.kind === 'count' ? pct(c) : 0, pp = just && view.justFrom != null ? pct(view.justFrom) : pc;
  const label = `${h.name}: ${done ? 'done' : skip ? 'skipped, tap to tick instead' : h.kind === 'count' ? `${c} of ${h.target_count}, tap to add one` : 'not done, tap to tick'}`;
  return `<li class="habit ${done ? 'done' : ''} ${skip ? 'skip' : ''} ${just ? 'just' : ''}" style="--hc:${col};--hink:${inkOn(col)};--i:${i}" data-id="${h.id}" data-hint="${h.kind === 'count' ? 'Tap to add one' : 'Tap to tick it off'}">
    <button class="h-main" data-a="habitMenu" data-id="${h.id}" aria-label="${esc(h.name)} options">
      <span class="h-ic" aria-hidden="true">${hi(h.icon)}</span>
      <span class="h-txt"><span class="h-name"><span>${esc(h.name)}</span></span><span class="h-meta ${!skip && (atRisk || rp) || !skip && /^Due (today|tomorrow)/.test(due) ? 'risk' : ''}">${skip ? 'Skipped · doesn’t count' : rp ? rpLine : comeback ? `Fresh start · best ${st.longest}` : atRisk ? 'Keep it alive tonight' : esc(sub)}</span></span>
    </button>
    ${!st.current && !st.longest && !done ? '' : `<span class="h-streak ${frozenNow ? 'frozen' : ''} ${st.current ? '' : 'zero'}" aria-label="Streak ${st.current} ${unit}${frozenNow ? ', saved by a freeze' : ''}">${frozenNow ? I.snow : I.flame}${roll(st.current, just && done)}<small>${unit}</small></span>`}
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
  const daily = list.filter(h => h.schedule_type !== 'x_per_week' && !isSkipped(h.id, d));
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
        ${daily.length ? `<p class="hero-n on-sky"><b data-count="${doneN}">${doneN}</b><span>/${daily.length}</span> ${doneAll ? '<em>summit reached</em>' : isToday && currentBreak() ? 'done · <em>on a break</em>' : 'done'}</p>` : ''}
      </div>
    </section>
    <div class="sheet-top">
      ${weekStrip(d)}
      ${isToday && currentBreak() ? breakCard(currentBreak()) : isToday ? missedYesterday() || recap() : ''}
      ${!editable(d) ? `<p class="note">${I.lock}<span>Days more than a week ago are locked, so streaks stay honest.</span></p>` : ''}
      ${!hs.length ? `<div class="empty"><h2 class="display">Start with <em>one</em> habit.</h2>
          <p class="muted">Small and daily beats big and rare. Add as many as you like, free, always.</p>
          <button class="btn mt3" data-a="newHabit">${I.plus} Add a habit</button></div>`
        : !list.length ? `<div class="empty"><p class="muted">Nothing scheduled for this day. Enjoy the rest.</p></div>`
        : habitLists(list, d)}
      ${isToday ? pushAsk(d) || squadAsk() : ''}
      ${isToday ? weekSummary() : ''}
      ${isToday && hs.length && canInstall() && !nudgeHidden() ? installCard() : ''}
    </div>
`;
}

// Forgot to tick last night? Offer yesterday before the streak quietly breaks (until noon).
function missedYesterday() {
  if (new Date().getHours() >= 12) return '';
  const y = addDays(today(), -1);
  const open = activeHabits().filter(h => dueOn(h, y) && h.schedule_type !== 'x_per_week' && countFor(h.id, y) < h.target_count && streakOf(h, addDays(y, -1)).current > 0);
  if (!open.length) return '';
  return `<button class="note yday" data-a="pickDay" data-d="${y}">${I.left}<span>${open.length === 1 ? `<b>${esc(open[0].name)}</b> isn’t ticked for yesterday.` : `${open.length} habits aren’t ticked for yesterday.`} Did you do ${open.length === 1 ? 'it' : 'them'}? Tap to fill in.</span></button>`;
}

// On a break: say so, and offer the way back.
const breakCard = b => `<aside class="break-card"><span class="bk-ic" aria-hidden="true">${I.pause}</span>
    <div class="grow"><b>Break until ${new Date(b.end_date + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</b><span class="muted small">Streaks are paused. Anything you tick still counts.</span></div>
    <button class="btn sm" data-a="endBreak">I’m back</button></aside>`;

// Brand new: nothing ticked ever. The first circle pulses with a small "tap to tick" hint.
const firstRun = () => !Object.values(state.checkins).some(days => Object.values(days).some(n => n > 0));

// The first two days of a new week: how last week went, in one card. Closes for the week.
const RECAP = 'keepup:recap';
export const recapSeen = w => { try { return localStorage.getItem(RECAP) === w; } catch (e) { return true; } };
export const hideRecap = w => { try { localStorage.setItem(RECAP, w); } catch (e) {} };
function recap() {
  const t = today(), w = weekOf(t, state.profile.week_start);
  if (addDays(w, 2) <= t || recapSeen(w)) return '';
  const w0 = addDays(w, -7), hs = activeHabits().filter(h => h.start_date <= addDays(w, -1));
  if (!hs.length) return '';
  let due = 0, done = 0, perfect = 0; const per = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(w0, i), list = hs.filter(h => dueOn(h, d) && h.schedule_type !== 'x_per_week');
    const n = list.filter(h => countFor(h.id, d) >= h.target_count).length;
    due += list.length; done += n; if (list.length && n === list.length) perfect++;
  }
  for (const h of hs) {
    if (h.schedule_type === 'x_per_week') { let n = 0; for (let i = 0; i < 7; i++) if (countFor(h.id, addDays(w0, i)) >= h.target_count) n++; due += h.times_per_week; done += Math.min(n, h.times_per_week); per.push([h, Math.min(1, n / h.times_per_week)]); continue; }
    let dn = 0, dd = 0; for (let i = 0; i < 7; i++) { const d = addDays(w0, i); if (dueOn(h, d)) { dd++; if (countFor(h.id, d) >= h.target_count) dn++; } }
    if (dd) per.push([h, dn / dd]);
  }
  if (!due) return '';
  const p = Math.round(done / due * 100), star = per.sort((a, b) => b[1] - a[1])[0];
  const line = p >= 90 ? 'An almost perfect week. Do it again.' : p >= 70 ? 'A strong week. Keep the rhythm going.' : p >= 40 ? 'Not bad. This week, aim for one more tick a day.' : 'A slow week. That’s fine, today is a fresh start.';
  return `<aside class="recap" data-w="${w}">
    <div class="recap-top"><span class="eyebrow">Last week</span><button class="x" data-a="hideRecap" aria-label="Close">×</button></div>
    <div class="recap-nums"><b data-count="${p}" data-suffix="%">${p}%</b><span><b>${perfect}</b> perfect day${perfect === 1 ? '' : 's'}${star && star[1] > 0 ? `<br>Best: ${esc(star[0].name)}` : ''}</span></div>
    <p class="muted small">${line}</p>
  </aside>`;
}

// While in beta, KeepUp is installed from the browser. A quiet card, not a pop-up.
const installCard = () => `<aside class="install-card">
    <img src="/icons/icon-192.png" alt="" width="44" height="44">
    <div class="grow"><b>Keep it one tap away</b><span class="muted small">${isIOS() ? 'Add KeepUp to your home screen. Opens full screen, works offline.' : 'Install KeepUp. Opens like an app, works offline.'}</span></div>
    <button class="btn sm" data-a="install">Add</button>
    <button class="x" data-a="hideInstall" aria-label="Not now">×</button>
  </aside>`;

// Ask for notifications right after someone ticks something (not out of nowhere), at most once a week.
// Studies of permission prompts: asking after a meaningful action gets far more yeses.
const ASKED = 'keepup:pushask';
let pushNow = null;
export const askedRecently = () => { try { return Date.now() - (+localStorage.getItem(ASKED) || 0) < 7 * 864e5; } catch (e) { return true; } };
export const notNow = () => { try { localStorage.setItem(ASKED, String(Date.now())); } catch (e) {} };
function pushAsk(d) {
  if (pushNow !== 'off' || askedRecently()) return '';
  if (!activeHabits().some(h => countFor(h.id, d) > 0)) return '';
  const t = state.profile.evening_reminder_at || '21:00';
  const at = new Date(`2000-01-01T${t}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `<aside class="install-card push-ask"><span class="ic-b" aria-hidden="true">${I.bell}</span>
    <div class="grow"><b>Nudge me tomorrow?</b><span class="muted small">At ${esc(at)}, only if something’s left.</span></div>
    <button class="btn sm" data-a="pushYes">Yes</button>
    <button class="x" data-a="pushNo" aria-label="Not now">×</button>
  </aside>`;
}

// The hardest step for a squad is the first invite. Ask once things are going well (a 3-day streak),
// not on day one, and at most every two weeks.
const SQASK = 'keepup:sqask';
export const squadLater = () => { try { localStorage.setItem(SQASK, String(Date.now())); } catch (e) {} };
function squadAsk() {
  try {
    if (localStorage.getItem('keepup:insquad') === '1' || Date.now() - (+localStorage.getItem(SQASK) || 0) < 14 * 864e5) return '';
  } catch (e) { return ''; }
  const best = Math.max(0, ...activeHabits().map(h => streakOf(h).current));
  if (best < 3) return '';
  return `<aside class="install-card squad-ask"><span class="faces sm" aria-hidden="true"><span style="--fc:#FF5A1F"></span><span style="--fc:#7B4BC4"></span><span style="--fc:#1F9D7A"></span></span>
    <div class="grow"><b>Better with a friend</b><span class="muted small">${best} days in. Bring a friend, keep each other going.</span></div>
    <button class="btn sm" data-a="squadYes">Invite</button>
    <button class="x" data-a="squadNo" aria-label="Not now">×</button>
  </aside>`;
}

export function afterRender(root, rerender) {
  mountScene(root); view.just = null;
  if (pushNow === null && rerender) import('../lib/push.js').then(m => m.pushState()).then(st => { const was = pushNow; pushNow = st; if (st === 'off' && was !== st && !askedRecently()) rerender(); }).catch(() => {});
  // Swipe the week strip to go back a week (or forward again, never past today).
  const wk = root.querySelector('.week'); if (!wk || !rerender) return;
  let x0 = null, y0 = 0;
  wk.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  wk.addEventListener('touchend', e => {
    if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    const t = today(), cur = view.day && view.day <= t ? view.day : t;
    let d = addDays(cur, dx > 0 ? -7 : 7); if (d > t) d = t;
    if (d === cur) return;
    view.day = d; lastSel = null; slide = dx > 0 ? 'from-left' : 'from-right'; SOUNDS.tap(); buzz(6); rerender();
  });
}

// Tap: yes/no flips, count adds one (and wraps back to 0 after the target, so a slip is fixable).
// Ticking the last habit of a part of the day (when Today is grouped) gets its own small moment.
function partFinished(h, d) {
  const list = activeHabits().filter(x => dueOn(x, d));
  if (!list.some(x => x.time_of_day)) return false;
  return list.filter(x => (x.time_of_day || null) === (h.time_of_day || null)).every(x => isSkipped(x.id, d) || countFor(x.id, d) >= x.target_count);
}
export function tick(btn, rerender) {
  const id = btn.dataset.id, d = btn.dataset.d, h = state.habits.find(x => x.id === id); if (!h) return;
  const c = countFor(id, d), wasDone = c >= h.target_count;
  const next = h.kind === 'count' ? (wasDone ? 0 : c + 1) : (wasDone ? 0 : 1);
  const hsBefore = activeHabits().filter(x => owed(x, d) && x.schedule_type !== 'x_per_week'), allBefore = hsBefore.every(x => countFor(x.id, d) >= x.target_count);
  const before = streakOf(h, d);
  if (!setCount(id, d, next)) return;
  const nowDone = next >= h.target_count;
  if (nowDone && !wasDone) {
    buzz(14); setTimeout(() => burst(document.querySelector(`.habit[data-id="${id}"] .tick`), COLOURS[h.colour]), 60);
    const all = hsBefore.length && hsBefore.every(x => countFor(x.id, d) >= x.target_count);
    const doneN = activeHabits().filter(x => owed(x, d) && countFor(x.id, d) >= x.target_count).length;
    SOUNDS.step(doneN - 1);
    const st = streakOf(h, d), hit = d === today() && h.schedule_type !== 'x_per_week' && MILESTONES.includes(st.current);
    if (before.repair && st.repaired.length > before.repaired.length) setTimeout(() => celebrate(st.current, h.name, COLOURS[h.colour], 'Streak repaired. Welcome back.', hi(h.icon)), 450);
    else if (hit) setTimeout(() => celebrate(st.current, h.name, COLOURS[h.colour], null, hi(h.icon)), 450);
    else if (all && !allBefore) setTimeout(() => { SOUNDS.summit(); confetti(36); buzz(30); }, 650);
    else if (partFinished(h, d)) { view.partDone = h.time_of_day || 'any'; setTimeout(() => { SOUNDS.step(6); buzz(20); }, 380); setTimeout(() => { view.partDone = null; }, 1500); }
    checkNew(hit || before.repair ? 3900 : all && !allBefore ? 2600 : 1200);
  } else if (next > c) { SOUNDS.plus(); buzz(8); }
  else { SOUNDS.undo(); buzz(8); toast(`<span class="t-one">Unticked ${esc(h.name)}</span><button class="link" data-a="undoTick" data-id="${id}" data-d="${d}" data-c="${c}">Undo</button>`); }
  view.just = id; view.justFrom = c;
  rerender();
  if (nowDone && !wasDone) { const el = document.querySelector(`.habit[data-id="${id}"] .tick`); el?.focus({ preventScroll: true }); }
}
