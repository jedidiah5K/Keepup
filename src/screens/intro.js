// First run (step engine adapted from JobDone's intro): name → starter habits → look. Under a minute.
// The trail in the scene climbs a little with every step. Account, reminders and the squad invite
// steps join once sign-in and notifications exist.
import { state, setProfile, saveHabit } from '../lib/store.js';
import { THEMES, swapTheme } from '../lib/theme.js';
import { STARTERS } from './habitForm.js';
import { esc } from '../ui/sheets.js';
import { scene, mountScene } from '../ui/scene.js';

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
    <div class="ob-picks">${STARTERS.map((h, i) => `<button class="ob-pick ${OB.picks.has(i) ? 'on' : ''}" aria-pressed="${OB.picks.has(i)}" data-a="obPick" data-i="${i}"><span aria-hidden="true">${h.icon}</span>${esc(h.name)}</button>`).join('')}</div>`;
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
// Before anything else: an account (email and password). Keeps streaks safe and makes squads work.
export function welcome() {
  return `<div class="ob welcome"><section class="hero">${scene(.08)}</section>
    <div class="ob-body"><h1>Habits that stick, <em>with friends.</em></h1>
      <p class="muted">Unlimited habits, streaks and squads. Free forever on the basics, no ads.</p></div>
    <div class="ob-foot stack-foot"><button class="btn wide" data-a="auth" data-mode="up">Create an account</button>
      <button class="btn ghost wide" data-a="auth" data-mode="in">I already have one</button></div></div>`;
}

export function afterRender(root) { mountScene(root); }

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
