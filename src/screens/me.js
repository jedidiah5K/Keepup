// Me: look and feel, reminders, habits, your data.
import { hi } from '../ui/hicons.js';
import { state, setProfile, activeHabits, archivedHabits, archiveHabit, deleteHabit, reorder, exportJSON, exportCSV, currentBreak, startBreak, endBreak } from '../lib/store.js';
import { THEMES, swapTheme } from '../lib/theme.js';
import { I } from '../ui/icons.js';
import { SOUNDS } from '../ui/feedback.js';
import { esc, openSheet, closeSheet, confirmSheet, toast } from '../ui/sheets.js';
import { cloud, syncLine } from '../lib/session.js';
import { canInstall, installed } from '../ui/install.js';
import { pushState, enablePush, disablePush } from '../lib/push.js';
import { TROPHIES } from '../lib/trophies.js';
import { medal, myTrophies } from '../ui/medal.js';
import { streakOf } from './today.js';

const toggle = (key, label, sub = '') => `<label class="row-set"><span><span>${label}</span>${sub ? `<span class="muted small">${sub}</span>` : ''}</span>
  <input type="checkbox" role="switch" class="switch" data-a="pref" data-k="${key}" ${state.profile[key] !== false ? 'checked' : ''}></label>`;

export function render() {
  const p = state.profile;
  return `<header class="top"><div><div class="eyebrow">Me</div><h1>${p.display_name ? `<em>${esc(p.display_name)}</em>` : 'You'}</h1></div></header>
    ${card()}
    <section class="group"><div class="g-h">Account</div>
      ${cloud.user ? `<div class="row-set"><span><span>${esc(cloud.user.email)}</span><span class="muted small sync-line ${cloud.error ? 'warn' : ''}">${syncLine()}</span></span><button class="chip" data-a="syncNow">Sync</button></div>
        <button class="row-set" data-a="signOut"><span>Sign out</span>${I.right}</button>`
      : `<button class="row-set acct-cta" data-a="auth" data-mode="up"><span><span>Back up your habits</span><span class="muted small">Free account. Keeps streaks safe if you lose your phone, and you’ll need it for squads.</span></span>${I.right}</button>
        <button class="row-set" data-a="auth" data-mode="in"><span>Sign in</span>${I.right}</button>`}
      ${canInstall() ? `<button class="row-set" data-a="install"><span><span>Add to home screen</span><span class="muted small">Opens full screen like a normal app</span></span>${I.right}</button>` : installed() ? '' : ''}
    </section>
    <section class="group"><div class="g-h">You</div>
      <label class="row-set"><span>Name</span><input class="in-right" data-a="name" maxlength="40" value="${esc(p.display_name)}" placeholder="Your name" autocomplete="given-name"></label>
    </section>
    <section class="group"><div class="g-h">Look</div>
      <div class="themes" role="radiogroup" aria-label="Theme">${THEMES.map(t => `<button class="theme-pick ${p.theme === t.k ? 'on' : ''}" role="radio" aria-checked="${p.theme === t.k}" data-a="theme" data-k="${t.k}">
        <span class="t-sw" aria-hidden="true">${t.sw.map(c => `<i style="background:${c}"></i>`).join('')}</span>
        <span class="t-name">${t.name}${t.pro ? ' <span class="pro beta">Free in beta</span>' : ''}</span><span class="muted small">${t.desc}</span></button>`).join('')}</div>
      ${toggle('sounds_on', 'Sounds')}${toggle('haptics_on', 'Haptics', 'A little buzz when you tick')}
    </section>
    <section class="group"><div class="g-h">Reminders</div>
      <div id="push-row">${pushRow(pushRow.last)}</div>
      <label class="row-set"><span><span>Evening check</span><span class="muted small">“You still have 2 habits left today”</span></span><input type="time" class="in-right" data-a="evening" value="${esc(p.evening_reminder_at || '')}" aria-label="Evening reminder time, clear to turn off"></label>
      <p class="muted small pad">Each habit can have its own reminder too. Set it when you edit the habit.</p>
    </section>
    <section class="group"><div class="g-h">Habits</div>
      <label class="row-set"><span>Week starts on</span><select class="in-right" data-a="weekstart"><option value="1" ${p.week_start === 1 ? 'selected' : ''}>Monday</option><option value="7" ${p.week_start === 7 ? 'selected' : ''}>Sunday</option></select></label>
      ${(b => b ? `<button class="row-set" data-a="endBreak"><span><span>On a break</span><span class="muted small">Until ${esc(new Date(b.end_date + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}. Tap to come back early.</span></span>${I.right}</button>`
        : `<button class="row-set" data-a="takeBreak"><span><span>Take a break</span><span class="muted small">Holiday or sick? Pause every streak for up to 30 days.</span></span>${I.right}</button>`)(currentBreak())}
      <button class="row-set" data-a="manage"><span>Manage habits</span><span class="muted">${activeHabits().length}${archivedHabits().length ? ` · ${archivedHabits().length} archived` : ''} ${I.right}</span></button>
    </section>
    <section class="group"><div class="g-h">Your data</div>
      <button class="row-set" data-a="export" data-f="csv"><span>Export as CSV</span>${I.right}</button>
      <button class="row-set" data-a="export" data-f="json"><span>Export as JSON</span>${I.right}</button>
      <a class="row-set" href="/privacy.html"><span>Privacy policy</span>${I.right}</a>
      <a class="row-set" href="/terms.html"><span>Terms</span>${I.right}</a>
      ${cloud.user ? `<button class="row-set danger-t" data-a="deleteAccount"><span>Delete account</span>${I.right}</button>` : ''}
    </section>
    <p class="beta-note"><span class="beta-tag">Beta</span><span>KeepUp is in beta, so <b>everything is free for now</b>. Unlimited habits, streaks and squads stay free forever. Some extras (like more looks) may become Pro later, and we’ll always ask first.</span></p>
    <p class="muted small center mt3">KeepUp · made for people who keep going</p>`;
}

// A small record of you: since when, ticks, best streak, and the latest trophies.
function card() {
  const hs = state.habits; if (!hs.length) return '';
  let ticks = 0;
  for (const h of hs) for (const n of Object.values(state.checkins[h.id] || {})) if (n >= (h.target_count || 1)) ticks++;
  const best = Math.max(0, ...hs.map(h => streakOf(h).longest || 0));
  const since = hs.reduce((m, h) => (h.start_date < m ? h.start_date : m), hs[0].start_date);
  const got = myTrophies(), mine = TROPHIES.filter(t => got.has(t.id));
  const fmt = n => n.toLocaleString();
  return `<section class="me-card">
    <dl class="me-stats">
      <div><dt>Since</dt><dd>${esc(new Date(since + 'T12:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' }))}</dd></div>
      <div><dt>Ticks</dt><dd>${fmt(ticks)}</dd></div>
      <div><dt>Best streak</dt><dd>${best}</dd></div>
    </dl>
    <button class="me-medals" data-a="tab" data-tab="stats" aria-label="${mine.length} of ${TROPHIES.length} trophies. Open stats.">
      <span class="me-m-row" aria-hidden="true">${mine.length ? mine.slice(-4).reverse().map(t => medal(t, true, 34)).join('') : medal(TROPHIES[0], false, 34)}</span>
      <span class="muted small">${mine.length ? `${mine.length} of ${TROPHIES.length} trophies` : 'No trophies yet. Three days in a row gets the first.'}</span>${I.right}
    </button>
  </section>`;
}

export function openManage(rerender) {
  const body = () => {
    const a = activeHabits(), z = archivedHabits();
    return `<h2 class="sheet-h">Manage habits</h2><p class="muted small">Drag ${I.drag} to reorder.</p>
      <ul class="dsort mlist" aria-label="Habits in order">${a.map(h => `<li data-dragitem data-id="${h.id}"><button class="drag" data-drag aria-label="Move ${esc(h.name)}. Use arrow keys.">${I.drag}</button><span class="m-ic" aria-hidden="true">${hi(h.icon)}</span><span class="grow">${esc(h.name)}</span><button class="chip" data-m="archive" data-id="${h.id}">Archive</button></li>`).join('')}</ul>
      ${z.length ? `<h3 class="g-h mt3">Archived</h3><ul class="mlist">${z.map(h => `<li><span class="m-ic" aria-hidden="true">${hi(h.icon)}</span><span class="grow">${esc(h.name)}</span><button class="chip" data-m="restore" data-id="${h.id}">Restore</button><button class="chip danger-t" data-m="delete" data-id="${h.id}">Delete</button></li>`).join('')}</ul>` : ''}`;
  };
  const sh = openSheet(body(), {
    label: 'Manage habits', onClose: rerender,
    mount(b) {
      const redo = () => { b.innerHTML = body(); };
      b.addEventListener('dsort', e => { const ids = activeHabits().map(h => h.id); const [x] = ids.splice(e.detail.from, 1); ids.splice(e.detail.to, 0, x); reorder(ids); redo(); if (e.detail.keyboard) b.querySelector(`[data-id="${x}"] [data-drag]`)?.focus(); });
      b.onclick = async e => {
        const m = e.target.closest('[data-m]'); if (!m) return; const id = m.dataset.id;
        if (m.dataset.m === 'archive') archiveHabit(id);
        if (m.dataset.m === 'restore') archiveHabit(id, false);
        if (m.dataset.m === 'delete' && await confirmSheet('Delete for good?', 'The habit and all its check-ins are removed. This can’t be undone.')) deleteHabit(id);
        redo();
      };
    },
  });
  return sh;
}

// Notifications row. The state is only known after a check, so the row fills in after render.
function pushRow(st) {
  const row = (title, sub, extra = '') => `<span><span>${title}</span><span class="muted small">${sub}</span></span>${extra}`;
  if (st === 'on') return `<button class="row-set" data-a="push" data-v="off">${row('Notifications', 'On for this phone. Tap to turn off.', '<span class="pill-on">On</span>')}</button>`;
  if (st === 'off') return `<button class="row-set" data-a="push" data-v="on">${row('Turn on notifications', 'Habit reminders and the evening check')}${I.right}</button>`;
  if (st === 'blocked') return `<div class="row-set">${row('Notifications are blocked', 'Allow them for KeepUp in your phone’s Settings, then come back.')}</div>`;
  if (st === 'install') return `<div class="row-set">${row('Notifications', 'Add KeepUp to your Home Screen first (Share → Add to Home Screen), then turn them on here.')}</div>`;
  if (st === 'unsupported') return `<div class="row-set">${row('Notifications', 'This browser can’t show them. Open KeepUp from your Home Screen.')}</div>`;
  return `<div class="row-set">${row('Notifications', 'Checking…')}</div>`;
}
export function afterRender(root) {
  pushState().then(st => { pushRow.last = st; const el = root.querySelector('#push-row'); if (el) el.innerHTML = pushRow(st); }).catch(() => {});
}
async function togglePush(el, rerender) {
  el.disabled = true;
  try {
    if (el.dataset.v === 'on') { const st = await enablePush(); toast(st === 'on' ? 'Notifications on. You’re set.' : 'Notifications are blocked. Allow them in Settings.'); }
    else { await disablePush(); toast('Notifications off for this phone.'); }
  } catch (e) { toast(navigator.onLine ? 'Couldn’t turn notifications on just now. Try again in a bit.' : 'You’re offline. Try again when you’re back online.'); }
  pushRow.last = null; rerender();
}

export function handle(a, el, rerender) {
  if (a === 'push') return togglePush(el, rerender);
  if (a === 'theme') {
    setProfile({ theme: el.dataset.k }); swapTheme(el.dataset.k, el); SOUNDS.theme();
    document.querySelectorAll('[data-a="theme"]').forEach(b => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  }
  if (a === 'pref') setProfile({ [el.dataset.k]: el.checked });
  if (a === 'weekstart') { setProfile({ week_start: +el.value }); rerender(); }
  if (a === 'evening') setProfile({ evening_reminder_at: el.value || null });
  if (a === 'name') setProfile({ display_name: el.value.trim().slice(0, 40) });
  if (a === 'manage') openManage(rerender);
  if (a === 'takeBreak') openBreak(rerender);
  if (a === 'export') {
    const csv = el.dataset.f === 'csv', blob = new Blob([csv ? exportCSV() : exportJSON()], { type: csv ? 'text/csv' : 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `keepup-${new Date().toISOString().slice(0, 10)}.${csv ? 'csv' : 'json'}`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }
}

// Take a break: pick how long. Starts today; no going back in time, so streaks stay honest.
export function openBreak(rerender) {
  const opts = [[3, '3 days'], [7, 'A week'], [14, 'Two weeks'], [30, 'Until I’m back', 'Up to 30 days']];
  const sh = openSheet(`<h2 class="sheet-h serif-h">Take a <em>break</em></h2>
    <p class="muted">Holiday, exams, feeling ill. While you’re on a break, missed days don’t break any streak. Anything you tick still counts. Your squad streak isn’t paused.</p>
    <div class="stack mt3">${opts.map(([n, l, sub]) => `<button class="row-set" data-n="${n}"><span><span>${l}</span>${sub ? `<span class="muted small">${sub}</span>` : ''}</span>${I.right}</button>`).join('')}</div>
    <p class="muted small mt2">Starts today. You can come back early any time.</p>`, {
    label: 'Take a break', onClose: rerender,
    mount: b => b.onclick = e => { const n = e.target.closest('[data-n]')?.dataset.n; if (!n) return; startBreak(+n); SOUNDS.theme(); closeSheet(sh); toast('Enjoy the break. Your streaks are safe.'); },
  });
}
