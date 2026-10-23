// Squad data from the server. Loaded with the account code (after first paint), never cached on
// the phone except the last board, so a squad screen opens with something while it refreshes.
import { sb, cloud } from './cloud.js';
import { state, today } from './store.js';
import { addDays } from './dates.js';
import { squadStreak } from './streaks.js';

export const SQ = { loaded: false, loading: false, error: null, squad: null, members: [], mine: new Set(), nudgedByMe: new Set(), nudgedMe: [], fivedByMe: new Set(), fivedMe: [] };
const changed = () => dispatchEvent(new Event('keepup:squad'));
async function must(q) { const { data, error } = await q; if (error) throw error; return data; }

export async function loadSquad() {
  if (!cloud.user || SQ.loading) return;
  if (!navigator.onLine) { Object.assign(SQ, { error: 'You’re offline. Your squad shows up when you’re back online.', loaded: true, at: Date.now() }); changed(); return; }
  SQ.loading = true; SQ.error = null; changed();
  try {
    const me = cloud.user.id, t = today();
    const rows = await must(sb.from('keepup_squad_members').select('squad_id, user_id, role, joined_at, keepup_squads(id, name, owner_id, invite_code, created_at)').eq('user_id', me).limit(1));
    if (!rows.length) { Object.assign(SQ, { squad: null, members: [] }); return; }
    const sq = rows[0].keepup_squads;
    const [mem, board, shared, nudges] = await Promise.all([
      must(sb.from('keepup_squad_members').select('user_id, role, joined_at').eq('squad_id', sq.id)),
      must(sb.rpc('keepup_squad_board', { sq: sq.id, since: addDays(t, -60) })),
      must(sb.from('keepup_squad_shared_habits').select('habit_id').eq('squad_id', sq.id)),
      must(sb.from('keepup_nudges').select('from_user, to_user, date, kind').eq('squad_id', sq.id).eq('date', t)),
    ]);
    const byUser = new Map(mem.map(m => [m.user_id, { id: m.user_id, role: m.role, joined: m.joined_at.slice(0, 10), name: '', habits: new Map(), done: new Set() }]));
    for (const r of board) {
      const u = byUser.get(r.user_id); if (!u) continue;
      u.name = r.display_name || 'Friend';
      if (r.habit_id) {
        const h = u.habits.get(r.habit_id) || { id: r.habit_id, name: r.habit_name, icon: r.icon, colour: r.colour, target: r.target_count, counts: {} };
        if (r.date) h.counts[r.date] = r.count;
        u.habits.set(r.habit_id, h);
        if (r.date && r.count >= (r.target_count || 1)) u.done.add(r.date);
      }
    }
    // My own ticks show instantly, before they've synced.
    const meU = byUser.get(me);
    if (meU) { meU.name = state.profile.display_name || meU.name || 'You'; }
    SQ.mine = new Set(shared.map(s => s.habit_id).filter(id => state.habits.some(h => h.id === id)));
    if (meU) { meU.done = new Set([...meU.done].filter(d => d !== t)); for (const id of SQ.mine) { const h = state.habits.find(x => x.id === id); if (h && (state.checkins[id]?.[t] || 0) >= h.target_count) meU.done.add(t); } }
    SQ.squad = sq;
    SQ.members = [...byUser.values()].sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : a.joined.localeCompare(b.joined)));
    // Before the high-five update is in the database, rows have no kind: they're all nudges.
    const of = k => nudges.filter(n => (n.kind || 'nudge') === k);
    SQ.nudgedByMe = new Set(of('nudge').filter(n => n.from_user === me).map(n => n.to_user));
    SQ.nudgedMe = of('nudge').filter(n => n.to_user === me).map(n => byUser.get(n.from_user)?.name).filter(Boolean);
    SQ.fivedByMe = new Set(of('five').filter(n => n.from_user === me).map(n => n.to_user));
    SQ.fivedMe = of('five').filter(n => n.to_user === me).map(n => byUser.get(n.from_user)?.name).filter(Boolean);
  } catch (e) { SQ.error = !navigator.onLine || /fetch|network/i.test(e?.message || '') ? 'You’re offline. Your squad shows up when you’re back online.' : 'Couldn’t load your squad just now.'; }
  finally { SQ.loading = false; SQ.loaded = true; SQ.at = Date.now(); if (!SQ.error) try { localStorage.setItem('keepup:insquad', SQ.squad ? '1' : ''); } catch (e) {} changed(); }
}

// My own ticks today, straight from the phone (the server may not have them yet).
export function refreshMe() {
  const me = SQ.members.find(m => m.id === cloud.user?.id), t = today(); if (!me) return;
  me.done.delete(t);
  for (const id of SQ.mine) { const h = state.habits.find(x => x.id === id); if (h && (state.checkins[id]?.[t] || 0) >= h.target_count) me.done.add(t); }
  for (const h of me.habits.values()) h.counts[t] = state.checkins[h.id]?.[t] || 0;
}
export const streakNow = () => SQ.squad ? squadStreak(SQ.members, { today: today() }) : { current: 0, longest: 0 };
export const inviteLink = () => `${location.origin}/?join=${encodeURIComponent(SQ.squad.invite_code)}`;

const err = e => { throw new Error(e.message || String(e)); };
export async function createSquad(name) { const { error } = await sb.rpc('keepup_create_squad', { squad_name: name }); if (error) err(error); await loadSquad(); }
export async function joinSquad(code) { const { data, error } = await sb.rpc('keepup_join_squad', { code }); if (error) err(error); if (!data) throw new Error('That invite link doesn’t work. Ask for a new one.'); await loadSquad(); }
export async function preview(code) { const { data, error } = await sb.rpc('keepup_invite_preview', { code }); if (error) err(error); return data?.[0] || null; }
export async function leaveSquad() { const { error } = await sb.rpc('keepup_leave_squad', { sq: SQ.squad.id }); if (error) err(error); await loadSquad(); }
export async function removeMember(id) { const { error } = await sb.rpc('keepup_remove_member', { sq: SQ.squad.id, member: id }); if (error) err(error); await loadSquad(); }
export async function renameSquad(name) { const { error } = await sb.rpc('keepup_rename_squad', { sq: SQ.squad.id, new_name: name }); if (error) err(error); await loadSquad(); }
export async function nudge(id) {
  const { error } = await sb.rpc('keepup_nudge', { sq: SQ.squad.id, friend: id, local_day: today() });
  if (error && !/already/i.test(error.message)) err(error);
  SQ.nudgedByMe.add(id); changed();
}
export async function highFive(id) {
  const { error } = await sb.rpc('keepup_high_five', { sq: SQ.squad.id, friend: id, local_day: today() });
  if (error && !/already/i.test(error.message)) err(error);
  SQ.fivedByMe.add(id); changed();
}
// Pick which of my habits the squad can see. Habits must be synced first (they live on the server).
export async function setShared(ids) {
  const { sync } = await import('./cloud.js'); await sync({ quiet: true });
  const want = new Set(ids), add = [...want].filter(id => !SQ.mine.has(id)), del = [...SQ.mine].filter(id => !want.has(id));
  if (add.length) { const { error } = await sb.from('keepup_squad_shared_habits').insert(add.map(habit_id => ({ squad_id: SQ.squad.id, habit_id }))); if (error) err(error); }
  if (del.length) { const { error } = await sb.from('keepup_squad_shared_habits').delete().eq('squad_id', SQ.squad.id).in('habit_id', del); if (error) err(error); }
  await loadSquad();
}
addEventListener('online', () => { if (SQ.error) loadSquad(); });
