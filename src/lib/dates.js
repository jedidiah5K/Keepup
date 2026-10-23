// Plain calendar dates as 'YYYY-MM-DD' strings. Check-ins are stored as the person's local date,
// so streak maths never needs a timezone; only localDate() looks at the clock.
const DAY = 86400e3;
const toUTC = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const fromUTC = ms => new Date(ms).toISOString().slice(0, 10);

export const addDays = (d, n) => fromUTC(toUTC(d) + n * DAY);
export const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / DAY);
// ISO weekday: 1 = Monday … 7 = Sunday.
export const isoWeekday = d => ((new Date(toUTC(d)).getUTCDay() + 6) % 7) + 1;
// First day of the week that holds d. weekStart is 1 (Monday) or 7 (Sunday).
export const weekOf = (d, weekStart = 1) => addDays(d, -((isoWeekday(d) - weekStart + 7) % 7));

// Today's date where the person is, e.g. localDate('Asia/Tokyo').
export function localDate(timeZone, at = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(at).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function* eachDay(from, to) {
  for (let d = from; d <= to; d = addDays(d, 1)) yield d;
}
