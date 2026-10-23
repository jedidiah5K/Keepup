// Streak rules, in plain words (shown to people in the app too):
// - Every day / chosen days: a streak is the run of scheduled days you completed in a row.
//   Days that aren't scheduled are skipped, never counted as misses.
// - X times a week: a streak is the run of weeks where you hit the target.
// - Today (or this week) never breaks a streak while there's still time to do it.
// - Streak freeze: each habit gets 1 a week (3 with Pro). It's used automatically on a miss,
//   only when there's a streak to save. A frozen day keeps the streak but doesn't add to it.
//   Unused freezes don't carry over.
// - Longest streak never goes down.
// - A break (holiday, sick days) pauses every streak: missed days inside it are skipped, and a
//   week that touches a break can't break a weekly streak. Ticks on a break still count.
import { addDays, daysBetween, eachDay, isoWeekday, weekOf } from './dates.js';

const isDone = (habit, count) => (count || 0) >= Math.max(1, habit.target_count || 1);
const isScheduled = (habit, d) => habit.schedule_type !== 'weekdays' || (habit.schedule_days || []).includes(isoWeekday(d));

/**
 * @param habit   { kind, target_count, schedule_type: 'daily'|'weekdays'|'x_per_week', schedule_days, times_per_week, start }
 *                start = local date the habit was created.
 * @param counts  { 'YYYY-MM-DD': count }
 * @param opts    { today, weekStart = 1, freezesPerWeek = 1 | (weekStartDate) => n, breaks = [{ start_date, end_date|null }] }
 * @returns       { current, longest, unit: 'days'|'weeks', frozen: [dates or week starts], doneToday }
 */
export function habitStreak(habit, counts, { today, weekStart = 1, freezesPerWeek = 1, breaks = [] } = {}) {
  const allowance = typeof freezesPerWeek === 'function' ? freezesPerWeek : () => freezesPerWeek;
  const off = onBreak(breaks);
  return habit.schedule_type === 'x_per_week'
    ? weeklyStreak(habit, counts, today, weekStart, allowance, off)
    : dailyStreak(habit, counts, today, weekStart, allowance, off);
}
export const onBreak = (breaks = []) => d => breaks.some(b => d >= b.start_date && (!b.end_date || d <= b.end_date));

function dailyStreak(habit, counts, today, weekStart, allowance, off) {
  let run = 0, longest = 0;
  const frozen = [], usedInWeek = {};
  const start = habit.start && habit.start <= today ? habit.start : today;
  for (const d of eachDay(start, today)) {
    if (!isScheduled(habit, d)) continue;
    if (isDone(habit, counts[d])) { run++; longest = Math.max(longest, run); continue; }
    if (off(d)) continue;   // on a break: a miss doesn't count
    if (d === today) break; // still time today
    const wk = weekOf(d, weekStart);
    if (run > 0 && (usedInWeek[wk] || 0) < allowance(wk)) { usedInWeek[wk] = (usedInWeek[wk] || 0) + 1; frozen.push(d); continue; }
    run = 0;
  }
  return { current: run, longest, unit: 'days', frozen, doneToday: isDone(habit, counts[today]) };
}

function weeklyStreak(habit, counts, today, weekStart, allowance, off) {
  const target = Math.min(7, Math.max(1, habit.times_per_week || 1));
  const start = habit.start && habit.start <= today ? habit.start : today;
  const thisWeek = weekOf(today, weekStart);
  let run = 0, longest = 0;
  const frozen = [];
  for (let wk = weekOf(start, weekStart); wk <= thisWeek; wk = addDays(wk, 7)) {
    let done = 0;
    for (let i = 0; i < 7; i++) { const d = addDays(wk, i); if (d >= start && d <= today && isDone(habit, counts[d])) done++; }
    // The first week only asks for what was still possible after the habit was made.
    const need = wk < start ? Math.min(target, 7 - daysBetween(wk, start)) : target;
    if (done >= need) { run++; longest = Math.max(longest, run); continue; }
    if ([...Array(7)].some((_, i) => off(addDays(wk, i)))) continue; // a week with a break neither counts nor breaks
    if (wk === thisWeek) break; // the week isn't over
    if (run > 0 && need - done <= allowance(wk)) { frozen.push(wk); continue; }
    run = 0;
  }
  const weekDone = [...Array(7)].reduce((n, _, i) => n + (isDone(habit, counts[addDays(thisWeek, i)]) && addDays(thisWeek, i) <= today ? 1 : 0), 0);
  return { current: run, longest, unit: 'weeks', frozen, doneToday: isDone(habit, counts[today]), weekDone, weekTarget: target };
}

/**
 * Squad streak: a day counts when every member who was in the squad that day completed at least
 * one shared habit. People count from the day after they join. Days with fewer than 2 members
 * neither count nor break. Today never breaks it.
 * @param members [{ joined: 'YYYY-MM-DD', done: Set<'YYYY-MM-DD'> }]
 */
export function squadStreak(members, { today, since } = {}) {
  let run = 0, longest = 0;
  const first = since || members.reduce((m, x) => (x.joined < m ? x.joined : m), today);
  for (const d of eachDay(first, today)) {
    const active = members.filter(m => m.joined < d);
    if (active.length < 2) continue;
    const all = active.every(m => m.done.has(d));
    if (all) { run++; longest = Math.max(longest, run); continue; }
    if (d === today) break;
    run = 0;
  }
  return { current: run, longest };
}

/** Share of scheduled days done between from and to (inclusive), for stats. */
export function completion(habit, counts, from, to, breaks = []) {
  const off = onBreak(breaks);
  if (habit.schedule_type === 'x_per_week') {
    let done = 0; for (const d of eachDay(from, to)) if (isDone(habit, counts[d])) done++;
    const weeks = Math.max(1, Math.ceil((daysBetween(from, to) + 1) / 7));
    return Math.min(1, done / (weeks * (habit.times_per_week || 1)));
  }
  let due = 0, done = 0;
  for (const d of eachDay(from, to)) if (isScheduled(habit, d)) { if (isDone(habit, counts[d])) { due++; done++; } else if (!off(d)) due++; }
  return due ? done / due : 0;
}
