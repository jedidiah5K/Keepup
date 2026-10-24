import { describe, it, expect } from 'vitest';
import { weekdayRates } from '../src/lib/insights.js';
import { addDays, isoWeekday } from '../src/lib/dates.js';

const h = { id: 'a', schedule_type: 'daily', target_count: 1, start_date: '2026-01-01' };
const dueOn = (x, d) => d >= x.start_date;

describe('weekdayRates', () => {
  it('finds the strongest and hardest weekday', () => {
    const c = {}; const from = '2026-09-07'; // a Monday
    for (let i = 0; i < 28; i++) { const d = addDays(from, i); if (isoWeekday(d) !== 5) c[d] = 1; } // never on Fridays
    const r = weekdayRates([h], { a: c }, { from, to: addDays(from, 27), dueOn });
    expect(r.worst).toBe(5);
    expect(r.rates[4]).toBe(0);
    expect(r.rates[0]).toBe(1);
  });
  it('says nothing with under two weeks of data', () => {
    const r = weekdayRates([h], { a: {} }, { from: '2026-09-07', to: '2026-09-13', dueOn });
    expect(r.best).toBe(null);
  });
  it('says nothing when every day is about the same', () => {
    const c = {}; const from = '2026-09-07';
    for (let i = 0; i < 28; i++) c[addDays(from, i)] = 1;
    expect(weekdayRates([h], { a: c }, { from, to: addDays(from, 27), dueOn }).best).toBe(null);
  });
  it('skips days on a break', () => {
    const c = {}; const from = '2026-09-07';
    for (let i = 0; i < 28; i++) { const d = addDays(from, i); if (isoWeekday(d) !== 5) c[d] = 1; }
    const r = weekdayRates([h], { a: c }, { from, to: addDays(from, 27), dueOn, onBreak: d => isoWeekday(d) === 5 });
    expect(r.worst).not.toBe(5);
  });
});
