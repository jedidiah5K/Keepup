// First run (step engine adapted from JobDone's intro): name → starter habits → look. Under a minute.
// Account, reminders and the squad invite steps join once sign-in and notifications exist.
import { state, setProfile, saveHabit } from '../lib/store.js';
import { THEMES, applyTheme } from '../lib/theme.js';
import { STARTERS } from './habitForm.js';
import { esc } from '../ui/sheets.js';

export const OB = { step: 0, picks: new Set([0, 2]) };
const STEPS = ['you', 'habits', 'look'];

export function render() {
  const s = STEPS[OB.step], dots = `<div class="ob-dots" aria-label="Step ${OB.step + 1} of ${STEPS.length}">${STEPS.map((_, i) => `<i class="${i <= OB.step ? 'on' : ''}"></i>`).join('')}</div>`;
  let inner = '';
  if (s === 'you') inner = `<div class="ob-hero" aria-hidden="true">🔥</div><h1>Habits that stick, with friends.</h1>
    <p class="muted">Unlimited habits, free forever. No paywall on the basics, ever.</p>
    <label class="fld mt3"><span>What should we call you?</span><input data-ob="name" maxlength="40" value="${esc(state.profile.display_name)}" placeholder="First name" autocomplete="given-name" autofocus></label>`;
  if (s === 'habits') inner = `<h1>Pick a few to start</h1><p class="muted">You can change or add more any time.</p>
    <div class="ob-picks">${STARTERS.map((h, i) => `<button class="ob-pick ${OB.picks.has(i) ? 'on' : ''}" aria-pressed="${OB.picks.has(i)}" data-a="obPick" data-i="${i}"><span aria-hidden="true">${h.icon}</span>${esc(h.name)}</button>`).join('')}</div>`;
  if (s === 'look') inner = `<h1>Pick your look</h1><p class="muted">Change it later in Me.</p>
    <div class="themes">${THEMES.filter(t => !t.pro).map(t => `<button class="theme-pick ${state.profile.theme === t.k ? 'on' : ''}" aria-pressed="${state.profile.theme === t.k}" data-a="obTheme" data-k="${t.k}">
      <span class="t-sw" aria-hidden="true">${t.sw.map(c => `<i style="background:${c}"></i>`).join('')}</span><span class="t-name">${t.name}</span><span class="muted small">${t.desc}</span></button>`).join('')}</div>`;
  return `<div class="ob">${dots}<div class="ob-body">${inner}</div>
    <div class="ob-foot">${OB.step ? '<button class="btn ghost" data-a="obBack">Back</button>' : '<span></span>'}
      <button class="btn" data-a="obNext">${OB.step === STEPS.length - 1 ? 'Start' : s === 'habits' && !OB.picks.size ? 'Skip, I’ll make my own' : 'Next'}</button></div></div>`;
}

export function handle(a, el) {
  const name = document.querySelector('[data-ob="name"]'); if (name) setProfile({ display_name: name.value.trim().slice(0, 40) });
  if (a === 'obPick') { const i = +el.dataset.i; OB.picks.has(i) ? OB.picks.delete(i) : OB.picks.add(i); }
  if (a === 'obTheme') { setProfile({ theme: el.dataset.k }); applyTheme(el.dataset.k); }
  if (a === 'obBack') OB.step = Math.max(0, OB.step - 1);
  if (a === 'obNext') {
    if (OB.step < STEPS.length - 1) OB.step++;
    else { [...OB.picks].sort().forEach(i => saveHabit({ kind: 'yes_no', target_count: 1, schedule_type: 'daily', ...STARTERS[i] })); setProfile({ onboarded: true }); }
  }
}
