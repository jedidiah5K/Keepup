// App state, saved on the phone first (works offline) and synced to Supabase in the background.
// Like JobDone: every change is applied straight away, written to localStorage, and queued
// as a pending operation until the server has it. Each row has an id made on the phone, so a
// retried sync can never double count.
import { localDate } from './dates.js';

const LS = 'keepup:v1';
const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };

export const state = {
  profile: { display_name: '', timezone: tz(), week_start: 1, theme: 'paper', sounds_on: true, haptics_on: true, evening_reminder_at: '21:00', onboarded: false },
  habits: [],          // see keepup_habits columns
  checkins: {},        // { habitId: { 'YYYY-MM-DD': count } }
  pending: [],         // [{ op: 'upsert'|'delete', table, row }]
  squad: null,         // filled from the server
};

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(LS) || 'null');
    if (s) Object.assign(state, s, { profile: { ...state.profile, ...s.profile } });
  } catch (e) {}
  state.profile.timezone = tz(); // follow the phone when travelling
}
let saveT = null;
export function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify({ profile: state.profile, habits: state.habits, checkins: state.checkins, pending: state.pending })); } catch (e) {} }, 60);
  window.dispatchEvent(new Event('keepup:changed'));
}

export const today = () => localDate(state.profile.timezone);
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const queue = (op, table, row) => { state.pending.push({ op, table, row, at: Date.now() }); };

export const activeHabits = () => state.habits.filter(h => !h.archived_at).sort((a, b) => a.sort_order - b.sort_order);
export const archivedHabits = () => state.habits.filter(h => h.archived_at);
export const habitById = id => state.habits.find(h => h.id === id);
export const countFor = (habitId, d) => (state.checkins[habitId] || {})[d] || 0;

export const LIMITS = { name: 60, squad: 40, note: 500 };
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);

export function saveHabit(h) {
  const now = new Date().toISOString();
  const row = {
    id: h.id || uid(), name: clean(h.name, LIMITS.name) || 'New habit', icon: clean(h.icon, 8) || '✅', colour: h.colour || 'tangerine',
    kind: h.kind === 'count' ? 'count' : 'yes_no', target_count: h.kind === 'count' ? Math.min(100, Math.max(1, +h.target_count || 1)) : 1,
    schedule_type: ['daily', 'weekdays', 'x_per_week'].includes(h.schedule_type) ? h.schedule_type : 'daily',
    schedule_days: (h.schedule_days || []).filter(d => d >= 1 && d <= 7), times_per_week: h.schedule_type === 'x_per_week' ? Math.min(7, Math.max(1, +h.times_per_week || 3)) : null,
    reminder_time: h.reminder_time || null, sort_order: h.sort_order ?? (Math.max(0, ...state.habits.map(x => x.sort_order + 1))),
    start_date: h.start_date || today(), archived_at: h.archived_at || null, created_at: h.created_at || now, updated_at: now,
  };
  if (row.schedule_type === 'weekdays' && !row.schedule_days.length) row.schedule_type = 'daily';
  const i = state.habits.findIndex(x => x.id === row.id);
  if (i >= 0) state.habits[i] = row; else state.habits.push(row);
  queue('upsert', 'keepup_habits', row); save();
  return row;
}
export function archiveHabit(id, on = true) { const h = habitById(id); if (h) saveHabit({ ...h, archived_at: on ? new Date().toISOString() : null }); }
export function deleteHabit(id) {
  state.habits = state.habits.filter(h => h.id !== id); delete state.checkins[id];
  queue('delete', 'keepup_habits', { id }); save();
}
export function reorder(ids) {
  ids.forEach((id, i) => { const h = habitById(id); if (h && h.sort_order !== i) { h.sort_order = i; queue('upsert', 'keepup_habits', h); } });
  save();
}

// Editable days: today and the 7 before it.
export const editable = d => { const t = today(); return d <= t && d >= addDaysLocal(t, -7); };
const addDaysLocal = (d, n) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + n * 864e5).toISOString().slice(0, 10);

export function setCount(habitId, d, count) {
  if (!editable(d)) return false;
  const m = state.checkins[habitId] || (state.checkins[habitId] = {});
  if (count > 0) { m[d] = Math.min(1000, count); queue('upsert', 'keepup_checkins', { habit_id: habitId, date: d, count: m[d] }); }
  else { delete m[d]; queue('delete', 'keepup_checkins', { habit_id: habitId, date: d }); }
  save();
  return true;
}

export function setProfile(patch) { Object.assign(state.profile, patch); queue('upsert', 'keepup_profiles', { ...state.profile }); save(); }

// Everything this person has, for Me → Export.
export function exportJSON() {
  return JSON.stringify({ exported_at: new Date().toISOString(), profile: state.profile, habits: state.habits, checkins: state.checkins }, null, 2);
}
export function exportCSV() {
  const rows = [['habit', 'date', 'count', 'target', 'done']];
  for (const h of state.habits) for (const [d, c] of Object.entries(state.checkins[h.id] || {}).sort()) rows.push([h.name, d, c, h.target_count, c >= h.target_count ? 'yes' : 'no']);
  return rows.map(r => r.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')).join('\n');
}
