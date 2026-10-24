// Squad tab: 2–5 friends, a shared streak, who's done today, nudges. Free.
// Squad data lives on the server (lib/squads.js loads with the account code after first paint).
import { hi } from '../ui/hicons.js';
import { state, today, activeHabits } from '../lib/store.js';
import { cloud, loadCloud } from '../lib/session.js';
import { COLOURS, inkOn } from '../lib/theme.js';
import { addDays, eachDay } from '../lib/dates.js';
import { I } from '../ui/icons.js';
import { esc, openSheet, closeSheet, toast, confirmSheet } from '../ui/sheets.js';
import { buzz, SOUNDS, confetti } from '../ui/feedback.js';

let mod = null; // lib/squads.js once loaded
const squads = async () => (mod ||= await import('../lib/squads.js'));
export const pendingJoin = { code: null };

const tint = id => { const c = Object.values(COLOURS); let n = 0; for (const ch of id) n = (n * 31 + ch.charCodeAt(0)) >>> 0; return c[n % c.length]; };
const initials = n => (n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const face = (m, size = '') => `<span class="face ${size}" style="--fc:${tint(m.id)};color:${inkOn(tint(m.id))}">${esc(initials(m.name))}</span>`;

const pitch = (cta) => `<header class="top"><div><div class="eyebrow">2–5 friends, free</div><h1>Your <em>squad</em></h1></div></header>
    <div class="squad-empty">
      <div class="faces" aria-hidden="true"><span style="--fc:#FF5A1F">JO</span><span style="--fc:#7B4BC4">MA</span><span style="--fc:#1F9D7A">SAM</span><span class="plus">${I.plus}</span></div>
      <h2 class="display">Streaks are easier <em>together.</em></h2>
      <p class="muted">Make a squad, drop the link in your group chat, and pick which habits your friends can see. Everything else stays private.</p>
      <ul class="ticks">
        <li>${I.check}<span>See who's checked in today</span></li>
        <li>${I.check}<span>A squad streak that grows when everyone shows up, with one freeze a week for off days</span></li>
        <li>${I.check}<span>Nudge a friend who hasn't (once a day, no spam)</span></li>
      </ul>
      ${cta}
    </div>`;

export function render() {
  if (!cloud.user) return pitch(`<button class="btn wide mt3" data-a="auth" data-mode="up">Make a free account to start</button>
      <p class="muted small mt2 center">Already have one? <button class="link" data-a="auth" data-mode="in">Sign in</button></p>`);
  const SQ = mod?.SQ;
  if (!SQ || !SQ.loaded) return `<header class="top"><div><div class="eyebrow">Squad</div><h1>Your <em>squad</em></h1></div></header><div class="skel" role="status" aria-label="Loading your squad"><i class="sk-hero"></i>${'<div class="sk-row"><i class="sk-face"></i><span><i></i><i></i></span></div>'.repeat(3)}</div>`;
  if (SQ.error && !SQ.squad) return pitch(`<p class="note">${esc(SQ.error)}</p><button class="btn wide mt3" data-a="sqReload">Try again</button>`);
  if (!SQ.squad) return pitch(`<div class="stack mt3"><button class="btn wide" data-a="sqCreate">Create a squad</button><button class="btn ghost wide" data-a="sqJoin">Join with a code</button></div>`);
  return board(SQ);
}

function board(SQ) {
  mod.refreshMe();
  const t = today(), me = cloud.user.id, st = mod.streakNow(), sq = SQ.squad;
  const ms = SQ.members, doneToday = ms.filter(m => m.done.has(t)).length, owner = sq.owner_id === me;
  const days = [...eachDay(addDays(t, -6), t)];
  const alone = ms.length < 2;
  return `<header class="top"><div><div class="eyebrow">Squad · ${ms.length} of 5</div><h1>${esc(sq.name)}</h1></div>
      <button class="icon-btn" data-a="sqMenu" aria-label="Squad options">${I.more}</button></header>
    ${SQ.fivedMe.length ? `<p class="nudged fived">${I.five}<span><b>${esc(SQ.fivedMe.join(' & '))}</b> high-fived you today.</span></p>` : ''}
    ${SQ.nudgedMe.length ? `<p class="nudged">${I.wave}<span><b>${esc(SQ.nudgedMe.join(' & '))}</b> nudged you today.</span></p>` : ''}
    <section class="sq-hero">
      <div class="sq-streak"><span class="sq-n" data-count="${st.current}">${st.current}</span><span class="sq-unit">day${st.current === 1 ? '' : 's'}<br><em>together</em></span></div>
      <div class="rope" style="--n:${ms.length}" aria-label="${doneToday} of ${ms.length} done today">
        <svg class="rope-line" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5 Q 25 ${doneToday === ms.length ? 5 : 9}, 50 5 T 100 5" pathLength="100" style="--pct:${ms.length ? doneToday / ms.length * 100 : 0}"/></svg>
        ${ms.map((m, i) => `<span class="knot ${m.done.has(t) ? 'on' : ''}" style="--i:${i}">${face(m)}</span>`).join('')}
      </div>
      ${(f => f ? `<p class="sq-frz">${I.snow}<span>Squad freeze used ${esc(new Date(f + 'T12:00').toLocaleDateString(undefined, { weekday: 'long' }))}. The streak lives on.</span></p>` : '')(st.frozen?.filter(x => x >= addDays(t, -6)).pop())}
      <p class="muted small">${alone ? 'Invite a friend to start your squad streak.' : doneToday === ms.length ? 'Everyone showed up today. The streak grows tonight.' : `${ms.length - doneToday} still to go today. Streak best: ${st.longest}.`}</p>
    </section>
    ${alone ? inviteCard() : ''}
    <ul class="members">${ms.map(m => memberRow(m, t, days, me)).join('')}</ul>
    ${!alone ? inviteCard(true) : ''}
    <button class="row-set" data-a="sqShare"><span><span>Habits your squad sees</span><span class="muted small">${SQ.mine.size ? `${SQ.mine.size} shared. The rest stay private.` : 'None yet. Pick at least one so your ticks count.'}</span></span>${I.right}</button>`;
}

function memberRow(m, t, days, me) {
  const isMe = m.id === me, done = m.done.has(t), habits = [...m.habits.values()];
  const doneN = habits.filter(h => (h.counts[t] || 0) >= h.target).length;
  return `<li class="member ${done ? 'done' : ''}">
    ${face(m, 'lg')}
    <div class="grow"><b>${esc(m.name)}${isMe ? ' <span class="muted small">(you)</span>' : ''}${m.role === 'owner' ? ' <span class="owner-tag">Owner</span>' : ''}</b>
      <span class="m-habits">${habits.length ? habits.map(h => `<i class="${(h.counts[t] || 0) >= h.target ? 'y' : ''}" title="${esc(h.name)}">${hi(h.icon)}</i>`).join('') : '<span class="muted small">No shared habits yet</span>'}</span>
      <span class="m-week" role="img" aria-label="Last 7 days: ${days.filter(d => m.done.has(d)).length} of 7 done">${days.map(d => `<i class="${m.done.has(d) ? 'y' : ''} ${d < m.joined ? 'pre' : ''}"></i>`).join('')}</span></div>
    ${isMe ? `<span class="m-state">${done ? 'Done' : `${doneN}/${habits.length}`}</span>`
      : done && mod.SQ.fivedByMe.has(m.id) ? `<span class="m-state ok" title="High-fived">${I.five}</span>`
      : done ? `<button class="chip five" data-a="sqFive" data-id="${m.id}" aria-label="High five ${esc(m.name)}">${I.five} High five</button>`
      : mod.SQ.nudgedByMe.has(m.id) ? '<span class="m-state muted small">Nudged</span>'
      : `<button class="chip" data-a="sqNudge" data-id="${m.id}">${I.wave} Nudge</button>`}
  </li>`;
}

const inviteCard = (slim = false) => `<div class="invite ${slim ? 'slim' : ''}">
    ${slim ? '' : '<p class="serif-note">Bring <em>your people.</em> A streak with friends is three times harder to drop.</p>'}
    <div class="row gap"><button class="btn grow" data-a="sqInvite">${I.plus} Invite friends</button></div>
  </div>`;

// Everyone showed up today: a small party, once a day.
function cheer() {
  const SQ = mod?.SQ, t = today(); if (!SQ?.squad || SQ.members.length < 2 || !SQ.members.every(m => m.done.has(t))) return;
  try { if (localStorage.getItem('keepup:sqcheer') === SQ.squad.id + t) return; localStorage.setItem('keepup:sqcheer', SQ.squad.id + t); } catch (e) { return; }
  setTimeout(() => { SOUNDS.summit(); confetti(40); buzz(30); }, 500);
}

export function afterRender() {
  if (!cloud.user) return;
  cheer();
  squads().then(m => { if (!m.SQ.loading && (!m.SQ.loaded || Date.now() - m.SQ.at > 20e3)) m.loadSquad(); });
}

// ---------- actions ----------
// Our own database messages are written for people; anything technical gets a plain sentence instead.
const fail = e => { const m = e?.message || ''; toast(esc(!m || /jwt|permission|violates|pgrst|fetch|network|schema|function|column|relation|syntax/i.test(m) ? 'Couldn’t reach your squad just now. Check your internet and try again.' : m)); };

export const ACTIONS = {
  sqReload: async () => (await squads()).loadSquad(),
  sqCreate: () => {
    const sh = openSheet(`<h2 class="sheet-h">Name your <em>squad</em></h2>
      <form class="sq-form"><label class="fld"><span>Squad name</span><input name="n" maxlength="40" required placeholder="e.g. 6am Club" autofocus></label>
      <div class="ideas">${['6am Club', 'Gym Rats', 'Book Worms', 'The Fam'].map(x => `<button type="button" class="chip" data-n="${x}">${x}</button>`).join('')}</div>
      <button class="btn wide mt3" type="submit">Create squad</button></form>`, {
      label: 'Create a squad',
      mount: b => {
        b.addEventListener('click', e => { const n = e.target.closest('[data-n]'); if (n) b.querySelector('input').value = n.dataset.n; });
        b.querySelector('form').onsubmit = async e => {
          e.preventDefault(); const name = e.target.n.value.trim(); if (!name) return;
          const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.classList.add('busy');
          try { const m = await squads(); await m.createSquad(name); closeSheet(sh); buzz(20); toast('Squad made. Now invite your friends.'); ACTIONS.sqShare(); }
          catch (x) { btn.disabled = false; btn.classList.remove('busy'); fail(x); }
        };
      },
    });
  },
  sqJoin: () => openJoin(pendingJoin.code),
  sqInvite: async () => {
    const m = await squads(), link = m.inviteLink(), code = m.joinCode();
    const text = code ? `Join my squad "${m.SQ.squad.name}" on KeepUp. In the app, go to Squad → Join with a code and type ${code}. Or tap:` : `Join my squad "${m.SQ.squad.name}" on KeepUp:`;
    openSheet(`<h2 class="sheet-h">Invite <em>friends</em></h2>
      ${code ? `<p class="muted small">They type this code in KeepUp: Squad → Join with a code. Works from the Home Screen app too.</p>
      <button class="join-code" data-copy="${esc(code)}" aria-label="Code ${esc(code.split('').join(' '))}. Tap to copy.">${esc(code)}</button>` : ''}
      <div class="row gap mt3"><button class="btn grow" data-send>Send invite</button><button class="btn ghost grow" data-copy="${esc(link)}">Copy link</button></div>
      <p class="muted small mt2">Room for ${5 - m.SQ.members.length} more. Anyone with the code or link can join while there’s room.</p>`, {
      label: 'Invite friends',
      mount: b => b.addEventListener('click', async e => {
        if (e.target.closest('[data-send]')) {
          if (navigator.share) { try { await navigator.share({ title: 'KeepUp squad', text, url: link }); } catch (x) {} return; }
          try { await navigator.clipboard.writeText(`${text} ${link}`); toast('Invite copied. Paste it to your friends.'); } catch (x) { toast('Couldn’t copy. Press and hold the code instead.'); }
          return;
        }
        const c = e.target.closest('[data-copy]'); if (!c) return;
        try { await navigator.clipboard.writeText(c.dataset.copy); buzz(10); toast('Copied.'); } catch (x) { toast('Couldn’t copy. Press and hold it instead.'); }
      }),
    });
  },
  sqNudge: async el => {
    el.disabled = true; el.classList.add('sent');
    try { await (await squads()).nudge(el.dataset.id); buzz([10, 40, 10]); toast('Nudge sent.'); } catch (x) { el.disabled = false; fail(x); }
  },
  sqFive: async el => {
    el.disabled = true; el.classList.add('slap'); SOUNDS.five(); buzz([18, 30, 12]);
    confetti(14);
    try { await (await squads()).highFive(el.dataset.id); } catch (x) { el.disabled = false; el.classList.remove('slap'); fail(x); }
  },
  sqShare: async () => {
    const m = await squads(), hs = activeHabits(), on = new Set(m.SQ.mine);
    const body = () => `<h2 class="sheet-h">What your <em>squad</em> sees</h2>
      <p class="muted small">Ticking any shared habit counts toward the squad streak. Unshared habits stay completely private.</p>
      <ul class="share-list">${hs.map(h => `<li><label><span class="h-ic" style="--hc:${COLOURS[h.colour]}">${hi(h.icon)}</span><span class="grow">${esc(h.name)}</span><input type="checkbox" role="switch" class="switch" data-h="${h.id}" ${on.has(h.id) ? 'checked' : ''}></label></li>`).join('')}</ul>
      <button class="btn wide mt3" data-save>Save</button>`;
    const sh = openSheet(body(), {
      label: 'Shared habits',
      mount: b => b.addEventListener('click', async e => {
        if (!e.target.closest('[data-save]')) return;
        const btn = e.target.closest('[data-save]'); btn.disabled = true; btn.classList.add('busy');
        const ids = [...b.querySelectorAll('[data-h]:checked')].map(x => x.dataset.h);
        try { await m.setShared(ids); closeSheet(sh); toast('Saved.'); } catch (x) { btn.disabled = false; btn.classList.remove('busy'); fail(x); }
      }),
    });
  },
  sqMenu: async () => {
    const m = await squads(), owner = m.SQ.squad.owner_id === cloud.user.id, others = m.SQ.members.filter(x => x.id !== cloud.user.id);
    const sh = openSheet(`<h2 class="sheet-h">${esc(m.SQ.squad.name)}</h2><div class="stack">
      ${owner ? '<button class="btn ghost wide" data-m="rename">Rename squad</button>' : ''}
      ${owner && others.length ? '<button class="btn ghost wide" data-m="remove">Remove someone</button>' : ''}
      <button class="btn ghost wide danger-t" data-m="leave">Leave squad</button></div>`, {
      label: 'Squad options',
      mount: b => b.addEventListener('click', async e => {
        const k = e.target.closest('[data-m]')?.dataset.m; if (!k) return; closeSheet(sh);
        try {
          if (k === 'leave' && await confirmSheet('Leave this squad?', 'Your habits stay yours. Your shared habits stop showing to the squad.', 'Leave')) { await m.leaveSquad(); toast('You left the squad.'); }
          if (k === 'rename') { const n = prompt('New squad name', m.SQ.squad.name); if (n && n.trim()) await m.renameSquad(n.trim().slice(0, 40)); }
          if (k === 'remove') {
            const pick = openSheet(`<h2 class="sheet-h">Remove someone</h2><div class="stack">${others.map(o => `<button class="btn ghost wide" data-r="${o.id}">${esc(o.name)}</button>`).join('')}</div>`, {
              label: 'Remove someone',
              mount: bb => bb.addEventListener('click', async ev => {
                const r = ev.target.closest('[data-r]'); if (!r) return; closeSheet(pick);
                if (await confirmSheet(`Remove ${r.textContent}?`, 'They can rejoin only with a new invite.', 'Remove')) { try { await m.removeMember(r.dataset.r); } catch (x) { fail(x); } }
              }),
            });
          }
        } catch (x) { fail(x); }
      }),
    });
  },
};

// Opened from an invite link (?join=CODE) or by pasting one.
export async function openJoin(code) {
  if (!cloud.user) {
    pendingJoin.code = code;
    // Opened in the browser. If KeepUp is already on their Home Screen, that copy has its own sign-in,
    // so give them the code to type there instead of making a second account here.
    const short = code && /^[A-Za-z2-9]{8}$/.test(code) ? code.toUpperCase().replace(/^(.{4})/, '$1 ') : null;
    const signUp = async () => { const a = await import('./account.js'); a.openAuth('up'); toast('Make a free account first, then you’ll join the squad.'); };
    if (!short) return signUp();
    const sh = openSheet(`<h2 class="sheet-h">You’re <em>invited</em></h2>
      <p class="muted small">Already have KeepUp on your Home Screen? Open it, go to Squad → Join with a code, and type:</p>
      <div class="join-code" aria-label="Code ${esc(short.split('').join(' '))}">${esc(short)}</div>
      <button class="btn wide mt3" data-new>I’m new to KeepUp</button>`, {
      label: 'Squad invite',
      mount: b => b.addEventListener('click', e => { if (e.target.closest('[data-new]')) { closeSheet(sh); signUp(); } }),
    });
    return;
  }
  const m = await squads();
  const parse = v => { const s = String(v || '').trim(); try { return new URL(s).searchParams.get('join') || s; } catch (e) { return s; } };
  const body = (p, c) => p ? `<div class="join-preview"><div class="faces sm" aria-hidden="true">${['#FF5A1F', '#7B4BC4', '#1F9D7A', '#1E6FD9'].slice(0, Math.min(p.members, 4)).map(c => `<span style="--fc:${c}"></span>`).join('')}</div>
        <h2 class="sheet-h">Join <em>${esc(p.name)}</em>?</h2><p class="muted">${p.members} ${p.members === 1 ? 'person' : 'people'} in it. You choose which habits they see.</p>
        ${p.full_squad ? '<p class="note">This squad is full (5 max).</p>' : `<button class="btn wide mt3" data-join="${esc(c)}">Join squad</button>`}</div>`
    : `<h2 class="sheet-h">Join a <em>squad</em></h2><form class="sq-form"><label class="fld"><span>Invite code</span><input name="c" class="code-in" placeholder="KX7P M2QD" autocomplete="off" autocapitalize="characters" spellcheck="false" autofocus></label>
        <p class="muted small">Ask a friend in the squad for it. A pasted invite link works too.</p>
        <p class="auth-err" role="alert"></p><button class="btn wide" type="submit">Continue</button></form>`;
  let p = null; if (code) { try { p = await m.preview(code); } catch (e) {} }
  const sh = openSheet(body(p, code), {
    label: 'Join a squad',
    mount: b => {
      b.addEventListener('submit', async e => {
        e.preventDefault(); const c = parse(e.target.c.value); const pv = c && await m.preview(c).catch(() => null);
        if (!pv) { b.querySelector('.auth-err').textContent = 'That code doesn’t work. Check it, or ask for a new one.'; return; }
        b.innerHTML = body(pv, c);
      });
      b.addEventListener('click', async e => {
        const j = e.target.closest('[data-join]'); if (!j) return; j.disabled = true; j.classList.add('busy');
        try { await m.joinSquad(j.dataset.join); pendingJoin.code = null; closeSheet(sh); buzz([10, 50, 10]); toast('You’re in. Pick which habits your squad sees.'); ACTIONS.sqShare(); }
        catch (x) { j.disabled = false; j.classList.remove('busy'); fail(x); }
      });
    },
  });
  pendingJoin.code = null;
}

export const loaded = () => mod;
