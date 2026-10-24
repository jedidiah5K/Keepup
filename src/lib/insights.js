// Patterns worth telling someone: which weekday they're strongest on, and which is hardest.
import { eachDay, isoWeekday } from './dates.js';

/**
 * Share of due habits done on each weekday between from and to (inclusive).
 * @returns { rates: [Mon..Sun] (number|null), best, worst, days } where best/worst are 1..7 or null.
 */
export function weekdayRates(habits, checkins, { from, to, dueOn, onBreak = () => false }) {
  const due = Array(8).fill(0), done = Array(8).fill(0);
  let days = 0;
  for (const d of eachDay(from, to)) {
    if (onBreak(d)) continue;
    const list = habits.filter(h => h.schedule_type !== 'x_per_week' && dueOn(h, d));
    if (!list.length) continue;
    days++;
    const w = isoWeekday(d);
    for (const h of list) { due[w]++; if ((checkins[h.id]?.[d] || 0) >= (h.target_count || 1)) done[w]++; }
  }
  const rates = [1, 2, 3, 4, 5, 6, 7].map(w => (due[w] >= 2 ? done[w] / due[w] : null));
  const known = rates.map((r, i) => [r, i + 1]).filter(([r]) => r != null);
  // Only worth saying once there are two weeks of data and a real gap between days.
  if (days < 14 || known.length < 3) return { rates, best: null, worst: null, days };
  const best = known.reduce((a, b) => (b[0] > a[0] ? b : a)), worst = known.reduce((a, b) => (b[0] < a[0] ? b : a));
  return best[0] - worst[0] >= 0.15 ? { rates, best: best[1], worst: worst[1], days } : { rates, best: null, worst: null, days };
}
