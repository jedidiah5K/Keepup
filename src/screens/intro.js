// First run (step engine adapted from JobDone's intro): name → starter habits → look. Under a minute.
// The trail in the scene climbs a little with every step. Account, reminders and the squad invite
// steps join once sign-in and notifications exist.
import { state, setProfile, saveHabit } from '../lib/store.js';
import { THEMES, swapTheme } from '../lib/theme.js';
import { STARTERS } from './habitForm.js';
import { esc } from '../ui/sheets.js';
import { hi } from '../ui/hicons.js';
import { scene, mountScene, climbTo } from '../ui/scene.js';

export const OB = { step: 0, picks: new Set([0, 2]) };
const STEPS = ['you', 'habits', 'look'];

export function render() {
  const s = STEPS[OB.step];
  let inner = '';
  if (s === 'you') inner = `<h1>Habits that stick, <em>with friends.</em></h1>
    <p class="muted">Unlimited habits, free forever. No paywall on the basics. Ever.</p>
    <label class="fld mt3"><span>What should we call you?</span><input data-ob="name" maxlength="40" value="${esc(state.profile.display_name)}" placeholder="First name" autocomplete="given-name"></label>
`;
  if (s === 'habits') inner = `<h1>Pick a few <em>to start.</em></h1><p class="muted">Change or add more any time.</p>
    <div class="ob-picks">${STARTERS.map((h, i) => `<button class="ob-pick ${OB.picks.has(i) ? 'on' : ''}" aria-pressed="${OB.picks.has(i)}" data-a="obPick" data-i="${i}"><span aria-hidden="true">${hi(h.icon)}</span>${esc(h.name)}</button>`).join('')}</div>`;
  if (s === 'look') inner = `<h1>Pick <em>your look.</em></h1><p class="muted">Change it later in Me.</p>
    <div class="themes">${THEMES.map(t => `<button class="theme-pick ${state.profile.theme === t.k ? 'on' : ''}" aria-pressed="${state.profile.theme === t.k}" data-a="obTheme" data-k="${t.k}">
      <span class="t-sw" aria-hidden="true">${t.sw.map(c => `<i style="background:${c}"></i>`).join('')}</span><span class="t-name">${t.name}${t.pro ? ' <span class="pro beta">Free in beta</span>' : ''}</span><span class="muted small">${t.desc}</span></button>`).join('')}</div>
    <p class="beta-note"><span class="beta-tag">Beta</span><span>KeepUp is in beta, so <b>everything is free for now</b>, extra looks included. Unlimited habits, streaks and squads stay free forever.</span></p>`;
  return `<div class="ob"><section class="hero">${scene(OB.step / STEPS.length + .12)}
      <div class="ob-dots" aria-label="Step ${OB.step + 1} of ${STEPS.length}">${STEPS.map((_, i) => `<i class="${i <= OB.step ? 'on' : ''}"></i>`).join('')}</div></section>
    <div class="ob-body" data-step="${s}">${inner}</div>
    <div class="ob-foot">${OB.step ? '<button class="btn ghost" data-a="obBack">Back</button>' : '<span></span>'}
      <button class="btn" data-a="obNext">${OB.step === STEPS.length - 1 ? 'Start' : s === 'habits' && !OB.picks.size ? 'Skip, I’ll make my own' : 'Next'}</button></div></div>`;
}
// Before anything else: three short cards on what KeepUp is, then an account (email and password).
// Swipe or wait; the trail climbs a little with each card, and a small live demo sits on the sky.
const CARDS = [
  { h: 'Habits that stick, <em>with friends.</em>', p: 'One tap a day. Watch the streak grow. Free forever on the basics, no ads.', demo: 'tick', pct: 18 },
  { h: 'Miss a day? <em>You’re covered.</em>', p: 'A streak freeze saves you once a week, and breaks pause everything for holidays and sick days.', demo: 'freeze', pct: 58 },
  { h: 'Better <em>together.</em>', p: 'Make a squad of up to 5 friends. See who showed up today and keep a streak going as a team.', demo: 'squad', pct: 100 },
];
const DEMOS = {
  tick: `<div class="dm-row"><span class="dm-ic">🧘</span><span class="dm-name">Meditate<small>Every day</small></span><span class="dm-streak">🔥 <b class="dm-flip"><i>12</i><i>13</i></b></span><span class="dm-tick"><svg viewBox="0 0 24 24"><path d="M5.5 12.5l4.2 4.2L18.5 7.8" pathLength="1"/></svg></span></div>`,
  freeze: `<div class="dm-row"><span class="dm-ic">📖</span><span class="dm-name">Read 10 pages<small>Saved by a freeze</small></span><span class="dm-streak frz">❄︎ <b>27</b></span><span class="dm-tick on"><svg viewBox="0 0 24 24"><path d="M5.5 12.5l4.2 4.2L18.5 7.8" pathLength="1"/></svg></span></div>`,
  squad: `<div class="dm-squad"><span class="dm-faces"><i style="--fc:#FF5A1F">JO</i><i style="--fc:#7B4BC4">MA</i><i style="--fc:#1F9D7A">SAM</i></span><span class="dm-name">6am Club<small>3 of 3 done · 21 days together</small></span></div>`,
};
export function welcome() {
  return `<div class="ob welcome"><section class="hero">${scene(CARDS[0].pct / 100)}
      <div class="dm" aria-hidden="true">${CARDS.map((c, i) => `<div class="dm-card ${i ? '' : 'on'}" data-dm="${i}">${DEMOS[c.demo]}</div>`).join('')}</div></section>
    <div class="ob-body"><div class="cards" tabindex="0" aria-roledescription="carousel" aria-label="What KeepUp does">${CARDS.map((c, i) => `<section class="card-i" aria-label="${i + 1} of ${CARDS.length}"><h1>${c.h}</h1><p class="muted">${c.p}</p></section>`).join('')}</div>
      <div class="card-dots" role="tablist">${CARDS.map((_, i) => `<button role="tab" aria-label="Card ${i + 1}" aria-selected="${!i}" data-i="${i}"></button>`).join('')}</div></div>
    <div class="ob-foot stack-foot"><button class="btn wide" data-a="auth" data-mode="up">Create an account</button>
      <button class="btn ghost wide" data-a="auth" data-mode="in">I already have one</button></div></div>`;
}

let autoT = null;
function mountCards(root) {
  const box = root.querySelector('.cards'); if (!box) return;
  let at = 0, touched = false;
  const show = i => {
    if (i === at) return; at = i;
    root.querySelectorAll('.card-dots button').forEach((b, j) => b.setAttribute('aria-selected', j === i));
    root.querySelectorAll('.dm-card').forEach((c, j) => c.classList.toggle('on', j === i));
    climbTo(root, CARDS[i].pct);
  };
  box.addEventListener('scroll', () => show(Math.round(box.scrollLeft / box.clientWidth)), { passive: true });
  const stop = () => { touched = true; clearInterval(autoT); };
  box.addEventListener('pointerdown', stop); box.addEventListener('touchstart', stop, { passive: true });
  root.querySelector('.card-dots').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; stop(); box.scrollTo({ left: +b.dataset.i * box.clientWidth, behavior: 'smooth' }); });
  clearInterval(autoT);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) autoT = setInterval(() => {
    if (touched || !document.body.contains(box)) return clearInterval(autoT);
    box.scrollTo({ left: ((at + 1) % CARDS.length) * box.clientWidth, behavior: 'smooth' });
  }, 4500);
}

export function afterRender(root) { mountScene(root); mountCards(root); }

// Returns true when the step changed (so the screen cross-fades).
export function handle(a, el) {
  const name = document.querySelector('[data-ob="name"]'); if (name) setProfile({ display_name: name.value.trim().slice(0, 40) });
  if (a === 'obPick') {
    const i = +el.dataset.i, on = !OB.picks.has(i); on ? OB.picks.add(i) : OB.picks.delete(i);
    el.classList.toggle('on', on); el.setAttribute('aria-pressed', on); on ? SOUNDS.step(OB.picks.size - 1) : SOUNDS.tap();
    const next = document.querySelector('[data-a="obNext"]'); if (next) next.textContent = OB.picks.size ? 'Next' : 'Skip, I’ll make my own';
    return false;
  }
  if (a === 'obTheme') {
    setProfile({ theme: el.dataset.k }); swapTheme(el.dataset.k, el); SOUNDS.theme();
    document.querySelectorAll('[data-a="obTheme"]').forEach(b => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    return false;
  }
  if (a === 'obBack') { OB.step = Math.max(0, OB.step - 1); return true; }
  if (a === 'obNext') {
    if (OB.step < STEPS.length - 1) OB.step++;
    else { [...OB.picks].sort().forEach(i => saveHabit({ kind: 'yes_no', target_count: 1, schedule_type: 'daily', ...STARTERS[i] })); setProfile({ onboarded: true }); }
    return true;
  }
}
