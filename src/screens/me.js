// Me: look and feel, reminders, habits, your data.
import { state, setProfile, activeHabits, archivedHabits, archiveHabit, deleteHabit, reorder, exportJSON, exportCSV } from '../lib/store.js';
import { THEMES, applyTheme } from '../lib/theme.js';
import { I } from '../ui/icons.js';
import { esc, openSheet, closeSheet, confirmSheet, toast } from '../ui/sheets.js';
import { cloud, syncLine } from '../lib/session.js';
import { canInstall, installed } from '../ui/install.js';

const toggle = (key, label, sub = '') => `<label class="row-set"><span><span>${label}</span>${sub ? `<span class="muted small">${sub}</span>` : ''}</span>
  <input type="checkbox" role="switch" class="switch" data-a="pref" data-k="${key}" ${state.profile[key] !== false ? 'checked' : ''}></label>`;

export function render() {
  const p = state.profile;
  return `<header class="top"><div><div class="eyebrow">Me</div><h1>${p.display_name ? `<em>${esc(p.display_name)}</em>` : 'You'}</h1></div></header>
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
        <span class="t-name">${t.name}${t.pro ? ' <span class="pro">Pro</span>' : ''}</span><span class="muted small">${t.desc}</span></button>`).join('')}</div>
      ${toggle('sounds_on', 'Sounds')}${toggle('haptics_on', 'Haptics', 'A little buzz when you tick')}
    </section>
    <section class="group"><div class="g-h">Reminders</div>
      <label class="row-set"><span><span>Evening check</span><span class="muted small">“You still have 2 habits left today”</span></span><input type="time" class="in-right" data-a="evening" value="${esc(p.evening_reminder_at || '')}" aria-label="Evening reminder time, clear to turn off"></label>
      <p class="muted small pad">Reminders arrive with the phone app. Each habit can have its own time too.</p>
    </section>
    <section class="group"><div class="g-h">Habits</div>
      <label class="row-set"><span>Week starts on</span><select class="in-right" data-a="weekstart"><option value="1" ${p.week_start === 1 ? 'selected' : ''}>Monday</option><option value="7" ${p.week_start === 7 ? 'selected' : ''}>Sunday</option></select></label>
      <button class="row-set" data-a="manage"><span>Manage habits</span><span class="muted">${activeHabits().length}${archivedHabits().length ? ` · ${archivedHabits().length} archived` : ''} ${I.right}</span></button>
    </section>
    <section class="group"><div class="g-h">Your data</div>
      <button class="row-set" data-a="export" data-f="csv"><span>Export as CSV</span>${I.right}</button>
      <button class="row-set" data-a="export" data-f="json"><span>Export as JSON</span>${I.right}</button>
      <a class="row-set" href="/privacy.html"><span>Privacy policy</span>${I.right}</a>
      <a class="row-set" href="/terms.html"><span>Terms</span>${I.right}</a>
    </section>
    <p class="muted small center">KeepUp · unlimited habits, free forever</p>`;
}

export function openManage(rerender) {
  const body = () => {
    const a = activeHabits(), z = archivedHabits();
    return `<h2 class="sheet-h">Manage habits</h2><p class="muted small">Drag ${I.drag} to reorder.</p>
      <ul class="dsort mlist" aria-label="Habits in order">${a.map(h => `<li data-dragitem data-id="${h.id}"><button class="drag" data-drag aria-label="Move ${esc(h.name)}. Use arrow keys.">${I.drag}</button><span aria-hidden="true">${esc(h.icon)}</span><span class="grow">${esc(h.name)}</span><button class="chip" data-m="archive" data-id="${h.id}">Archive</button></li>`).join('')}</ul>
      ${z.length ? `<h3 class="g-h mt3">Archived</h3><ul class="mlist">${z.map(h => `<li><span aria-hidden="true">${esc(h.icon)}</span><span class="grow">${esc(h.name)}</span><button class="chip" data-m="restore" data-id="${h.id}">Restore</button><button class="chip danger-t" data-m="delete" data-id="${h.id}">Delete</button></li>`).join('')}</ul>` : ''}`;
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

export function handle(a, el, rerender) {
  if (a === 'theme') { setProfile({ theme: el.dataset.k }); applyTheme(el.dataset.k); rerender(); if (THEMES.find(t => t.k === el.dataset.k)?.pro) toast('Pro themes are free to try while KeepUp is in testing.'); }
  if (a === 'pref') setProfile({ [el.dataset.k]: el.checked });
  if (a === 'weekstart') { setProfile({ week_start: +el.value }); rerender(); }
  if (a === 'evening') setProfile({ evening_reminder_at: el.value || null });
  if (a === 'name') setProfile({ display_name: el.value.trim().slice(0, 40) });
  if (a === 'manage') openManage(rerender);
  if (a === 'export') {
    const csv = el.dataset.f === 'csv', blob = new Blob([csv ? exportCSV() : exportJSON()], { type: csv ? 'text/csv' : 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `keepup-${new Date().toISOString().slice(0, 10)}.${csv ? 'csv' : 'json'}`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }
}
