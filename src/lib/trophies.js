// Trophies: worked out from the habits and check-ins on the phone, so nothing extra is stored.
// Each trophy is earned once and never taken away by a later miss (they look at the best ever).
import { addDays, eachDay, weekOf } from './dates.js';

export const TROPHIES = [
  { id: 'streak3', kind: 'streak', n: 3, name: '3 in a row', how: 'Keep any habit going 3 days' },
  { id: 'streak7', kind: 'streak', n: 7, name: 'One week', how: 'A 7-day streak' },
  { id: 'streak14', kind: 'streak', n: 14, name: 'Two weeks', how: 'A 14-day streak' },
  { id: 'streak30', kind: 'streak', n: 30, name: 'A month', how: 'A 30-day streak' },
  { id: 'streak50', kind: 'streak', n: 50, name: 'Fifty', how: 'A 50-day streak' },
  { id: 'streak100', kind: 'streak', n: 100, name: 'One hundred', how: 'A 100-day streak' },
  { id: 'streak365', kind: 'streak', n: 365, name: 'A full year', how: 'A 365-day streak' },
  { id: 'perfectDay', kind: 'perfect', n: 1, name: 'Perfect day', how: 'Every habit done in one day' },
  { id: 'perfectWeek', kind: 'week', n: 7, name: 'Perfect week', how: 'Every habit, every day, Monday to Sunday' },
  { id: 'checks50', kind: 'total', n: 50, name: '50 ticks', how: '50 check-ins in all' },
  { id: 'checks250', kind: 'total', n: 250, name: '250 ticks', how: '250 check-ins in all' },
  { id: 'checks1000', kind: 'total', n: 1000, name: '1,000 ticks', how: '1,000 check-ins in all' },
  { id: 'comeback', kind: 'comeback', n: 1, name: 'Comeback', how: 'Win back a broken streak' },
  { id: 'squad', kind: 'squad', n: 1, name: 'Squad up', how: 'Join or start a squad' },
];

/**
 * @param habits   active and archived habits ({ id, target_count, schedule_type, schedule_days, start_date })
 * @param checkins { habitId: { date: count } }
 * @param streaks  { habitId: { longest, repaired? } } from streakOf
 * @param opts     { today, weekStart, dueOn(h, d), inSquad }
 * @returns Set of earned trophy ids
 */
export function earned(habits, checkins, streaks, { today, weekStart = 1, dueOn, inSquad = false }) {
  const got = new Set();
  const best = Math.max(0, ...habits.map(h => streaks[h.id]?.longest || 0));
  const done = (h, d) => (checkins[h.id]?.[d] || 0) >= (h.target_count || 1);
  let total = 0;
  for (const h of habits) for (const d in checkins[h.id] || {}) if (done(h, d)) total++;
  for (const t of TROPHIES) {
    if (t.kind === 'streak' && best >= t.n) got.add(t.id);
    if (t.kind === 'total' && total >= t.n) got.add(t.id);
  }
  if (habits.some(h => streaks[h.id]?.repaired?.length)) got.add('comeback');
  if (inSquad) got.add('squad');

  // Perfect days and weeks: only daily-style habits, and only days with something due.
  const daily = habits.filter(h => h.schedule_type !== 'x_per_week');
  if (!daily.length) return got;
  const first = daily.reduce((m, h) => (h.start_date < m ? h.start_date : m), today);
  // A day is "clear" when everything due was done (or nothing was due); "perfect" when something was.
  const clear = new Set(), perfect = new Set();
  for (const d of eachDay(first, today)) {
    const due = daily.filter(h => dueOn(h, d) && !(h.archived_at && h.archived_at.slice(0, 10) <= d));
    if (due.every(h => done(h, d))) { clear.add(d); if (due.length) perfect.add(d); }
  }
  if (perfect.size) got.add('perfectDay');
  for (let w = weekOf(first, weekStart); addDays(w, 6) <= today; w = addDays(w, 7)) {
    const wk = [...Array(7)].map((_, i) => addDays(w, i));
    if (wk.every(d => clear.has(d)) && wk.some(d => perfect.has(d))) { got.add('perfectWeek'); break; }
  }
  return got;
}
