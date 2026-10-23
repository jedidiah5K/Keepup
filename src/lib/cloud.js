// Accounts and sync with Supabase. The app always works from the phone's own copy first;
// this file sends queued changes up and brings the account's data down when signed in.
// The publishable key below is meant to be public (it only allows what the database rules allow).
import { createClient } from '@supabase/supabase-js';
import { state, save } from './store.js';
import { cloud } from './session.js';
export { cloud };

const URL = import.meta.env.VITE_SUPABASE_URL || 'https://xgmwqpasogwlvtjaapwo.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_GLmm-oqwG3az6syLgjv1cA_3a8-oD9y';
export const sb = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'keepup-auth', flowType: 'implicit' } });

const PROFILE_COLS = ['display_name', 'timezone', 'week_start', 'theme', 'sounds_on', 'haptics_on', 'evening_reminder_at'];
const HABIT_COLS = ['id', 'name', 'icon', 'colour', 'kind', 'target_count', 'schedule_type', 'schedule_days', 'times_per_week', 'reminder_time', 'sort_order', 'start_date', 'archived_at', 'created_at', 'updated_at'];
const pick = (o, cols) => Object.fromEntries(cols.filter(k => k in o).map(k => [k, o[k]]));
const profileRow = () => ({ id: cloud.user.id, ...pick(state.profile, PROFILE_COLS) });
const changed = () => window.dispatchEvent(new Event('keepup:cloud'));

// Errors that will never succeed on retry (bad data, not allowed): drop that change.
// Sign-in trouble (PGRST3xx) and network failures (no code) are retried instead.
const permanent = e => /^(2|4|P0|PGRST[^3])/.test(e?.code || '');

export async function start() {
  const { data } = await sb.auth.getSession();
  cloud.user = data.session?.user || null;
  sb.auth.onAuthStateChange((ev, session) => {
    const was = cloud.user?.id; cloud.user = session?.user || null;
    if (cloud.user && cloud.user.id !== was) setTimeout(() => sync({ first: !state.syncedUser || state.syncedUser !== cloud.user.id }), 0);
    changed();
  });
  if (cloud.user) sync({ first: state.syncedUser !== cloud.user.id });
  addEventListener('online', () => sync());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
  let t = null; addEventListener('keepup:changed', () => { clearTimeout(t); t = setTimeout(() => sync({ quiet: true }), 1500); });
}

// first: this phone hasn't synced with this account yet, so upload everything it has (old days too).
export async function sync({ first = false, quiet = false } = {}) {
  if (!cloud.user || cloud.syncing || !navigator.onLine) return;
  const hadError = cloud.error; let pulled = false;
  cloud.syncing = true; cloud.error = null;
  try {
    if (first) {
      // A new phone that hasn't been set up mustn't blank out the account's name and settings.
      await must(sb.from('keepup_profiles').upsert(profileRow(), { ignoreDuplicates: !state.profile.onboarded }));
      const checkins = [];
      for (const [habit_id, days] of Object.entries(state.checkins)) for (const [date, count] of Object.entries(days)) if (count > 0) checkins.push({ habit_id, date, count });
      await must(sb.rpc('keepup_import', { p_habits: state.habits.map(h => pick(h, HABIT_COLS)), p_checkins: checkins }));
      // Deletes made before signing in still need to happen; everything else is now on the server.
      state.pending = state.pending.filter(p => p.op === 'delete' && p.table !== 'keepup_profiles');
      state.syncedUser = cloud.user.id;
    }
    await flush();
    if (!quiet || first) pulled = await pull();
    cloud.lastSync = new Date();
  } catch (e) {
    cloud.error = e.message || String(e);
  } finally {
    cloud.syncing = false; save(true);
    // Redraw only when something on screen may have changed, so ticks don't get interrupted.
    if (pulled || first || hadError !== cloud.error) changed(); else dispatchEvent(new Event('keepup:synced'));
  }
}

async function must(q) { const { data, error } = await q; if (error) throw error; return data; }

// Send queued changes in order. Several changes to the same row collapse into the last one.
async function flush() {
  while (state.pending.length) {
    const p = state.pending[0];
    let res;
    if (p.table === 'keepup_profiles') res = await sb.from('keepup_profiles').upsert(profileRow());
    else if (p.table === 'keepup_habits') res = p.op === 'delete' ? await sb.from('keepup_habits').delete().eq('id', p.row.id) : await sb.from('keepup_habits').upsert(pick(p.row, HABIT_COLS));
    else if (p.table === 'keepup_checkins') res = p.op === 'delete'
      ? await sb.from('keepup_checkins').delete().eq('habit_id', p.row.habit_id).eq('date', p.row.date)
      : await sb.from('keepup_checkins').upsert({ habit_id: p.row.habit_id, date: p.row.date, count: p.row.count }, { onConflict: 'habit_id,date' });
    if (res?.error) {
      if (!permanent(res.error)) throw res.error;   // offline or server trouble: try again later
      console.warn('KeepUp: dropped a change the server refused', p, res.error.message);
    }
    state.pending.shift();
  }
}

// Bring the account's data down. Only runs with nothing waiting to go up, so nothing local is lost.
async function pull() {
  if (state.pending.length) return false;
  const prof = await must(sb.from('keepup_profiles').select(PROFILE_COLS.join(',')).maybeSingle());
  const habits = await must(sb.from('keepup_habits').select(HABIT_COLS.join(',')).eq('user_id', cloud.user.id));
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const page = await must(sb.from('keepup_checkins').select('habit_id,date,count').eq('user_id', cloud.user.id).order('date').range(from, from + 999));
    rows.push(...page); if (page.length < 1000) break;
  }
  if (state.pending.length) return false; // a change came in while we were downloading; next sync gets it
  // Someone who already set KeepUp up on another phone skips the first-run steps here.
  if (prof) Object.assign(state.profile, prof, { evening_reminder_at: prof.evening_reminder_at?.slice(0, 5) ?? null, onboarded: state.profile.onboarded || habits.length > 0 || !!prof.display_name });
  state.habits = habits.map(h => ({ ...h, reminder_time: h.reminder_time?.slice(0, 5) ?? null }));
  const ck = {}; for (const r of rows) (ck[r.habit_id] ||= {})[r.date] = r.count;
  state.checkins = ck;
  return true;
}

const site = () => location.origin + '/';
export const signUp = (email, password) => sb.auth.signUp({ email, password, options: { emailRedirectTo: site() } });
export const signIn = (email, password) => sb.auth.signInWithPassword({ email, password });
export const resetPassword = email => sb.auth.resetPasswordForEmail(email, { redirectTo: site() });
export const setPassword = password => sb.auth.updateUser({ password });
export async function signOut() {
  await sync();
  await sb.auth.signOut();
  // Clear this phone's copy so the next person to sign in here starts clean.
  try { localStorage.removeItem('keepup:v1'); } catch (e) {}
  location.reload();
}

// Removes the account and everything in it on the server, then this phone's copy.
export async function deleteAccount() {
  const { error } = await sb.rpc('keepup_delete_account');
  if (error) throw error;
  await sb.auth.signOut({ scope: 'local' });
  try { localStorage.removeItem('keepup:v1'); localStorage.removeItem('keepup-auth'); } catch (e) {}
  location.reload();
}
