import { describe, it, expect } from 'vitest';
import { habitStreak, squadStreak, completion } from '../src/lib/streaks.js';
import { addDays, localDate, weekOf, isoWeekday } from '../src/lib/dates.js';

// 2026-10-05 is a Monday.
const MON = '2026-10-05';
const days = (from, n) => [...Array(n)].map((_, i) => addDays(from, i));
const counts = (...ds) => Object.fromEntries(ds.flat().map(d => [d, 1]));
const daily = { kind: 'yes_no', target_count: 1, schedule_type: 'daily', start: '2026-09-01' };

describe('dates', () => {
  it('knows weekdays and week starts', () => {
    expect(isoWeekday(MON)).toBe(1);
    expect(weekOf('2026-10-08', 1)).toBe(MON);
    expect(weekOf('2026-10-08', 7)).toBe('2026-10-04'); // Sunday start
    expect(weekOf('2026-10-04', 1)).toBe('2026-09-28');
  });
  it('gives the local date in any timezone', () => {
    const at = new Date('2026-10-05T23:30:00Z');
    expect(localDate('Europe/London', at)).toBe('2026-10-06'); // BST, past midnight
    expect(localDate('America/New_York', at)).toBe('2026-10-05');
    expect(localDate('Asia/Tokyo', at)).toBe('2026-10-06');
  });
});

describe('daily habits', () => {
  it('counts consecutive done days', () => {
    const r = habitStreak(daily, counts(days(MON, 5)), { today: addDays(MON, 4), freezesPerWeek: 0 });
    expect(r).toMatchObject({ current: 5, longest: 5, doneToday: true });
  });
  it('does not break while today is still open', () => {
    const r = habitStreak(daily, counts(days(MON, 4)), { today: addDays(MON, 4), freezesPerWeek: 0 });
    expect(r.current).toBe(4);
    expect(r.doneToday).toBe(false);
  });
  it('breaks on a missed day without a freeze, keeps longest', () => {
    const c = counts(days(MON, 3), days(addDays(MON, 4), 2)); // miss Thursday
    const r = habitStreak(daily, c, { today: addDays(MON, 5), freezesPerWeek: 0 });
    expect(r).toMatchObject({ current: 2, longest: 3 });
  });
  it('uses the free weekly freeze on one missed day', () => {
    const c = counts(days(MON, 3), days(addDays(MON, 4), 2));
    const r = habitStreak(daily, c, { today: addDays(MON, 5) });
    expect(r.current).toBe(5); // frozen day keeps but does not add
    expect(r.frozen).toEqual([addDays(MON, 3)]);
  });
  it('only one free freeze per week, unused ones do not carry over', () => {
    const c = counts(MON, addDays(MON, 2), addDays(MON, 4)); // miss Tue and Thu
    const r = habitStreak(daily, c, { today: addDays(MON, 4) });
    expect(r.current).toBe(1);
    expect(r.frozen).toEqual([addDays(MON, 1)]);
  });
  it('a new week gives a new freeze', () => {
    const c = counts(days(MON, 14).filter(d => d !== addDays(MON, 3) && d !== addDays(MON, 9)));
    const r = habitStreak(daily, c, { today: addDays(MON, 13) });
    expect(r.current).toBe(12);
    expect(r.frozen).toHaveLength(2);
  });
  it('Pro gets 3 freezes a week', () => {
    const c = counts(MON, addDays(MON, 4));
    const r = habitStreak(daily, c, { today: addDays(MON, 4), freezesPerWeek: 3 });
    expect(r.current).toBe(2);
    expect(r.frozen).toHaveLength(3);
  });
  it('freezes can change per week (Pro ended)', () => {
    const c = counts(MON, addDays(MON, 3), addDays(MON, 7), addDays(MON, 10));
    const perWeek = wk => (wk === MON ? 3 : 1); // Pro in week 1 only
    const r = habitStreak(daily, c, { today: addDays(MON, 10), freezesPerWeek: perWeek });
    // week 1: two misses frozen. week 2: misses Tue+Wed, only one freeze → break.
    expect(r.current).toBe(1);
    expect(r.longest).toBe(2);
  });
  it('does not spend a freeze when there is no streak to save', () => {
    const r = habitStreak(daily, counts(addDays(MON, 2)), { today: addDays(MON, 2) });
    expect(r.frozen).toEqual([]);
    expect(r.current).toBe(1);
  });
  it('editing a past day un-freezes it', () => {
    const c = counts(days(MON, 3), days(addDays(MON, 4), 2));
    const before = habitStreak(daily, c, { today: addDays(MON, 5) });
    const after = habitStreak(daily, { ...c, [addDays(MON, 3)]: 1 }, { today: addDays(MON, 5) });
    expect(before.frozen).toHaveLength(1);
    expect(after).toMatchObject({ current: 6, frozen: [] });
  });
  it('count habits need the target', () => {
    const water = { ...daily, kind: 'count', target_count: 8 };
    const r = habitStreak(water, { [MON]: 8, [addDays(MON, 1)]: 5 }, { today: addDays(MON, 1) });
    expect(r).toMatchObject({ current: 1, doneToday: false });
  });
  it('ignores days before the habit existed', () => {
    const r = habitStreak({ ...daily, start: addDays(MON, 2) }, counts(addDays(MON, 2), addDays(MON, 3)), { today: addDays(MON, 3), freezesPerWeek: 0 });
    expect(r.current).toBe(2);
  });
  it('week start Sunday changes which week a freeze belongs to', () => {
    // Misses on Sat 10th and Sun 11th. Monday weeks: same week → one freeze. Sunday weeks: different weeks → two.
    const c = counts(days(MON, 5), addDays(MON, 7));
    expect(habitStreak(daily, c, { today: addDays(MON, 7), weekStart: 1 }).current).toBe(1);
    expect(habitStreak(daily, c, { today: addDays(MON, 7), weekStart: 7 }).current).toBe(6);
  });
});

describe('chosen weekdays', () => {
  const mwf = { ...daily, schedule_type: 'weekdays', schedule_days: [1, 3, 5] };
  it('skips unscheduled days', () => {
    const c = counts(MON, addDays(MON, 2), addDays(MON, 4), addDays(MON, 7));
    expect(habitStreak(mwf, c, { today: addDays(MON, 8), freezesPerWeek: 0 }).current).toBe(4);
  });
  it('a missed scheduled day breaks it', () => {
    const c = counts(MON, addDays(MON, 4));
    expect(habitStreak(mwf, c, { today: addDays(MON, 4), freezesPerWeek: 0 }).current).toBe(1);
  });
});

describe('X times a week', () => {
  const gym = { ...daily, schedule_type: 'x_per_week', times_per_week: 3, start: '2026-09-28' };
  it('counts weeks where the target was hit', () => {
    const c = counts('2026-09-28', '2026-09-30', '2026-10-02', MON, addDays(MON, 1), addDays(MON, 6));
    const r = habitStreak(gym, c, { today: addDays(MON, 6), freezesPerWeek: 0 });
    expect(r).toMatchObject({ current: 2, unit: 'weeks', weekDone: 3, weekTarget: 3 });
  });
  it('the current week does not break it', () => {
    const c = counts('2026-09-28', '2026-09-30', '2026-10-02', MON);
    expect(habitStreak(gym, c, { today: addDays(MON, 3), freezesPerWeek: 0 }).current).toBe(1);
  });
  it('a week 1 short is saved by the free freeze, 2 short is not', () => {
    const wk1 = counts('2026-09-28', '2026-09-30', '2026-10-02');
    const oneShort = { ...wk1, ...counts(MON, addDays(MON, 2)) };
    const twoShort = { ...wk1, ...counts(MON) };
    const today = addDays(MON, 8);
    expect(habitStreak(gym, oneShort, { today }).current).toBe(1);
    expect(habitStreak(gym, oneShort, { today }).frozen).toEqual([MON]);
    expect(habitStreak(gym, twoShort, { today }).current).toBe(0);
  });
  it('first week only asks for what was possible', () => {
    const late = { ...gym, start: addDays(MON, 5) }; // made on Saturday
    const r = habitStreak(late, counts(addDays(MON, 5), addDays(MON, 6)), { today: addDays(MON, 7), freezesPerWeek: 0 });
    expect(r.current).toBe(1);
  });
});

describe('squad streak', () => {
  const set = (...d) => new Set(d.flat());
  it('counts days where everyone did something, from the day after joining', () => {
    const a = { joined: '2026-10-01', done: set(days(MON, 4)) };
    const b = { joined: '2026-10-01', done: set(days(MON, 3)) };
    const c = { joined: addDays(MON, 1), done: set(addDays(MON, 2)) }; // joined Tue, counts from Wed
    const r = squadStreak([a, b, c], { today: addDays(MON, 3), since: MON });
    expect(r).toMatchObject({ current: 3, longest: 3 });
  });
  it('breaks when one member misses a past day', () => {
    const a = { joined: '2026-10-01', done: set(days(MON, 3)) };
    const b = { joined: '2026-10-01', done: set(MON, addDays(MON, 2)) };
    expect(squadStreak([a, b], { today: addDays(MON, 2), since: MON }).current).toBe(1);
  });
});

describe('completion', () => {
  it('is done / scheduled', () => {
    expect(completion(daily, counts(days(MON, 3)), MON, addDays(MON, 3))).toBe(0.75);
  });
});

describe('breaks', () => {
  const gym = { kind: 'yes_no', target_count: 1, schedule_type: 'x_per_week', times_per_week: 3, start: '2026-09-01' };
  it('missed days on a break are skipped, not counted as misses', () => {
    // done Mon–Tue, break Wed–Fri (nothing ticked), done Sat
    const r = habitStreak(daily, counts(days(MON, 2), addDays(MON, 5)), { today: addDays(MON, 5), freezesPerWeek: 0, breaks: [{ start_date: addDays(MON, 2), end_date: addDays(MON, 4) }] });
    expect(r.current).toBe(3);
  });
  it('ticks on a break still count', () => {
    const r = habitStreak(daily, counts(days(MON, 3)), { today: addDays(MON, 2), freezesPerWeek: 0, breaks: [{ start_date: addDays(MON, 1), end_date: null }] });
    expect(r.current).toBe(3);
  });
  it('an open break covers today and keeps the streak', () => {
    const r = habitStreak(daily, counts(days(MON, 2)), { today: addDays(MON, 4), freezesPerWeek: 0, breaks: [{ start_date: addDays(MON, 2), end_date: null }] });
    expect(r.current).toBe(2);
  });
  it('a missed day after the break ends still breaks it', () => {
    const r = habitStreak(daily, counts(days(MON, 2)), { today: addDays(MON, 5), freezesPerWeek: 0, breaks: [{ start_date: addDays(MON, 2), end_date: addDays(MON, 3) }] });
    expect(r.current).toBe(0);
  });
  it('a week with a break neither counts nor breaks a weekly streak', () => {
    const prev = addDays(MON, -7), next = addDays(MON, 7);
    const c = counts(prev, addDays(prev, 2), addDays(prev, 4), next, addDays(next, 1), addDays(next, 2));
    const r = habitStreak(gym, c, { today: addDays(next, 6), freezesPerWeek: 0, breaks: [{ start_date: addDays(MON, 1), end_date: addDays(MON, 3) }] });
    expect(r.current).toBe(2);
  });
  it('completion leaves missed break days out', () => {
    expect(completion(daily, counts(days(MON, 2)), MON, addDays(MON, 3), [{ start_date: addDays(MON, 2), end_date: null }])).toBe(1);
  });
});
