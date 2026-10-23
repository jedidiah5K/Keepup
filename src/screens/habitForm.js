// New / edit habit, in a bottom sheet.
import { state, saveHabit, archiveHabit, deleteHabit, habitById, LIMITS } from '../lib/store.js';
import { COLOURS } from '../lib/theme.js';
import { openSheet, closeSheet, confirmSheet, esc, toast } from '../ui/sheets.js';
import { hi, HICON_NAMES } from '../ui/hicons.js';

const EMOJI = ['✅', '💧', '🏋️', '📖', '🧘', '😴', '🚶', '🥗', '🧴', '📵', '✍️', '🎸', '🧠', '🦷', '💊', '🌞', '🏃', '🚴', '🧹', '💸'];
const DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun']];

export const STARTERS = [
  { name: 'Drink water', icon: 'i:water', colour: 'lagoon', kind: 'count', target_count: 8 },
  { name: 'Gym', icon: 'i:lift', colour: 'tangerine', schedule_type: 'x_per_week', times_per_week: 3 },
  { name: 'Read 10 pages', icon: 'i:book', colour: 'grape' },
  { name: 'Study', icon: 'i:study', colour: 'ocean', schedule_type: 'weekdays', schedule_days: [1, 2, 3, 4, 5] },
  { name: 'Skincare', icon: 'i:skin', colour: 'berry' },
  { name: 'No phone before bed', icon: 'i:nophone', colour: 'cocoa' },
  { name: 'Sleep by 11', icon: 'i:sleep', colour: 'grape' },
  { name: 'Walk', icon: 'i:walk', colour: 'leaf' },
];

export function openHabitForm(id, onDone) {
  const h = id ? habitById(id) : { name: '', icon: 'i:check', colour: 'tangerine', kind: 'yes_no', target_count: 1, schedule_type: 'daily', schedule_days: [1, 2, 3, 4, 5], times_per_week: 3, reminder_time: '' };
  const f = { ...h, schedule_days: [...(h.schedule_days?.length ? h.schedule_days : [1, 2, 3, 4, 5])], times_per_week: h.times_per_week || 3 };
  const body = () => `<form class="hform" novalidate>
    <h2 class="sheet-h">${id ? 'Edit habit' : 'New habit'}</h2>
    <label class="fld"><span>Name</span><input name="name" maxlength="${LIMITS.name}" value="${esc(f.name)}" placeholder="e.g. Drink water" required autocomplete="off" ${id ? '' : 'autofocus'}></label>
    ${!id ? `<div class="fld"><span>Ideas</span><div class="chips">${STARTERS.slice(0, 6).map((s, i) => `<button type="button" class="chip" data-x="starter" data-i="${i}">${hi(s.icon)} ${esc(s.name)}</button>`).join('')}</div></div>` : ''}
    <div class="fld"><span id="ic-l">Icon</span><div class="emoji-grid" role="radiogroup" aria-labelledby="ic-l" style="--hc:${COLOURS[f.colour]}">${[...HICON_NAMES.map(n => 'i:' + n), ...EMOJI].map(e => `<button type="button" role="radio" aria-checked="${f.icon === e}" class="emo ${e.startsWith('i:') ? 'drawn' : ''} ${f.icon === e ? 'on' : ''}" data-x="icon" data-v="${e}" aria-label="${e.startsWith('i:') ? e.slice(2) : e}">${hi(e)}</button>`).join('')}</div></div>
    <div class="fld"><span id="col-l">Colour</span><div class="swatches" role="radiogroup" aria-labelledby="col-l">${Object.entries(COLOURS).map(([k, v]) => `<button type="button" role="radio" aria-checked="${f.colour === k}" class="sw ${f.colour === k ? 'on' : ''}" style="--c:${v}" data-x="colour" data-v="${k}" aria-label="${k}" title="${k}"></button>`).join('')}</div></div>
    <div class="fld"><span>Type</span><div class="seg" role="radiogroup">
      <button type="button" role="radio" aria-checked="${f.kind === 'yes_no'}" class="${f.kind === 'yes_no' ? 'on' : ''}" data-x="kind" data-v="yes_no">Yes / no</button>
      <button type="button" role="radio" aria-checked="${f.kind === 'count'}" class="${f.kind === 'count' ? 'on' : ''}" data-x="kind" data-v="count">Count</button></div>
      ${f.kind === 'count' ? `<label class="inline mt2">Target per day <input name="target_count" type="number" inputmode="numeric" min="1" max="100" value="${f.target_count || 8}"></label>` : ''}</div>
    <div class="fld"><span>How often</span><div class="seg" role="radiogroup">
      ${[['daily', 'Every day'], ['weekdays', 'Some days'], ['x_per_week', 'X a week']].map(([k, l]) => `<button type="button" role="radio" aria-checked="${f.schedule_type === k}" class="${f.schedule_type === k ? 'on' : ''}" data-x="sched" data-v="${k}">${l}</button>`).join('')}</div>
      ${f.schedule_type === 'weekdays' ? `<div class="days mt2">${DAYS.map(([n, l]) => `<button type="button" class="dchip ${f.schedule_days.includes(n) ? 'on' : ''}" aria-pressed="${f.schedule_days.includes(n)}" data-x="day" data-v="${n}">${l}</button>`).join('')}</div>` : ''}
      ${f.schedule_type === 'x_per_week' ? `<div class="stepper mt2" role="group" aria-label="Times a week"><button type="button" data-x="tpw" data-v="-1" aria-label="Fewer">−</button><b>${f.times_per_week}×</b> a week, any days<button type="button" data-x="tpw" data-v="1" aria-label="More">+</button></div>` : ''}</div>
    <label class="fld"><span>Reminder time (optional)</span><input name="reminder_time" type="time" value="${esc(f.reminder_time || '')}"><small class="muted small">Reminders start when the phone app arrives. Set it now and it’ll just work.</small></label>
    <button class="btn wide mt3" type="submit">${id ? 'Save' : 'Add habit'}</button>
    ${id ? `<div class="row gap mt2"><button type="button" class="btn ghost grow" data-x="archive">Archive</button><button type="button" class="btn ghost danger-t grow" data-x="delete">Delete</button></div>
      <p class="muted small mt2">Archiving hides it from Today and keeps all its history. Nothing is ever archived for you.</p>` : ''}
  </form>`;
  const readInputs = b => { const fd = new FormData(b.querySelector('form')); f.name = fd.get('name') ?? f.name; if (fd.has('target_count')) f.target_count = +fd.get('target_count'); f.reminder_time = fd.get('reminder_time') || ''; };
  const sh = openSheet(body(), {
    label: id ? 'Edit habit' : 'New habit',
    mount(b) {
      b.onclick = async e => {
        const x = e.target.closest('[data-x]'); if (!x) return;
        readInputs(b);
        const v = x.dataset.v;
        if (x.dataset.x === 'icon') f.icon = v;
        else if (x.dataset.x === 'colour') f.colour = v;
        else if (x.dataset.x === 'kind') { f.kind = v; if (v === 'count' && f.target_count < 2) f.target_count = 8; }
        else if (x.dataset.x === 'sched') f.schedule_type = v;
        else if (x.dataset.x === 'day') { const n = +v; f.schedule_days = f.schedule_days.includes(n) ? f.schedule_days.filter(d => d !== n) : [...f.schedule_days, n].sort(); }
        else if (x.dataset.x === 'tpw') f.times_per_week = Math.min(6, Math.max(1, f.times_per_week + +v));
        else if (x.dataset.x === 'starter') Object.assign(f, { kind: 'yes_no', target_count: 1, schedule_type: 'daily', ...STARTERS[+x.dataset.i] });
        else if (x.dataset.x === 'archive') { archiveHabit(id); closeSheet(sh); toast(`Archived ${esc(f.name)}. Find it in Me → Manage habits.`); onDone(); return; }
        else if (x.dataset.x === 'delete') {
          if (await confirmSheet(`Delete “${f.name}”?`, 'This removes the habit and all its check-ins for good. Archive it instead to keep the history.')) { deleteHabit(id); closeSheet(sh); onDone(); }
          return;
        }
        const y = b.closest('.sheet').scrollTop; b.innerHTML = body(); b.closest('.sheet').scrollTop = y;
      };
      b.onsubmit = e => {
        e.preventDefault(); readInputs(b);
        if (!String(f.name).trim()) { const i = b.querySelector('[name=name]'); i.setAttribute('aria-invalid', 'true'); i.focus(); toast('Give it a name first'); return; }
        if (f.schedule_type === 'weekdays' && !f.schedule_days.length) { toast('Pick at least one day'); return; }
        saveHabit(f); closeSheet(sh); onDone();
      };
    },
  });
}
