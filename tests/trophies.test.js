import { describe, it, expect } from 'vitest';
import { earned } from '../src/lib/trophies.js';
import { addDays } from '../src/lib/dates.js';

const MON = '2026-10-05';
const H = (id, o = {}) => ({ id, target_count: 1, schedule_type: 'daily', schedule_days: [], start_date: MON, ...o });
const dueOn = (h, d) => d >= h.start_date;
const fill = (from, n) => Object.fromEntries([...Array(n)].map((_, i) => [addDays(from, i), 1]));

describe('trophies', () => {
  it('gives streak trophies from the best streak ever', () => {
    const got = earned([H('a')], {}, { a: { longest: 14 } }, { today: MON, dueOn });
    expect([...got].filter(t => t.startsWith('streak'))).toEqual(['streak3', 'streak7', 'streak14']);
  });
  it('perfect day and perfect week', () => {
    const hs = [H('a'), H('b')], ck = { a: fill(MON, 7), b: fill(MON, 7) };
    const got = earned(hs, ck, {}, { today: addDays(MON, 7), dueOn });
    expect(got.has('perfectDay') && got.has('perfectWeek')).toBe(true);
  });
  it('no perfect week with one miss, and not before the week ends', () => {
    const ck = { a: fill(MON, 7), b: { ...fill(MON, 3), ...fill(addDays(MON, 4), 3) } };
    expect(earned([H('a'), H('b')], ck, {}, { today: addDays(MON, 8), dueOn }).has('perfectWeek')).toBe(false);
    expect(earned([H('a')], { a: fill(MON, 5) }, {}, { today: addDays(MON, 4), dueOn }).has('perfectWeek')).toBe(false);
  });
  it('counts check-ins, comebacks and squads', () => {
    const got = earned([H('a')], { a: fill(MON, 50) }, { a: { longest: 2, repaired: ['x'] } }, { today: addDays(MON, 60), dueOn, inSquad: true });
    expect(got.has('checks50') && got.has('comeback') && got.has('squad')).toBe(true);
    expect(got.has('checks250')).toBe(false);
  });
});
