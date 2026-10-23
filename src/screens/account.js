// Sign in / create account, in a bottom sheet. Email + password, and no emails are sent;
// Google and Apple sign-in come with the phone apps.
import { signIn, signUp, resetPassword, setPassword, signOut } from '../lib/cloud.js';
import { state } from '../lib/store.js';
import { esc, openSheet, closeSheet, toast, confirmSheet } from '../ui/sheets.js';

const EYE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/><path class="slash" d="M4 4l16 16"/></svg>';

const MODES = {
  in: { h: 'Welcome <em>back</em>', btn: 'Sign in' },
  up: { h: 'Keep your <em>streaks</em> safe', btn: 'Create account' },
  reset: { h: 'Forgot your <em>password?</em>', btn: 'Send reset link' },
  newpw: { h: 'Pick a new <em>password</em>', btn: 'Save password' },
};

export function openAuth(mode = 'up') {
  const body = m => `<h2 class="sheet-h serif-h">${MODES[m].h}</h2>
    ${m === 'up' ? '<p class="muted small">Backs up your habits and keeps them in step on every device. You need one for squads.</p>' : ''}
    ${m === 'reset' ? '<p class="muted small">We’ll email you a link to set a new one.</p>' : ''}
    <form class="auth" data-mode="${m}" novalidate>
      ${m !== 'newpw' ? `<label class="fld"><span>Email</span><input name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254" autofocus></label>` : ''}
      ${m !== 'reset' ? `<label class="fld"><span>Password</span><span class="pw-wrap"><input name="pw" type="password" minlength="8" maxlength="72" required autocomplete="${m === 'in' ? 'current-password' : 'new-password'}"><button type="button" class="pw-eye" data-eye aria-label="Show password" aria-pressed="false">${EYE}</button></span></label>` : ''}
      ${m === 'up' || m === 'newpw' ? `<label class="fld"><span>Confirm password</span><span class="pw-wrap"><input name="pw2" type="password" minlength="8" maxlength="72" required autocomplete="new-password"><button type="button" class="pw-eye" data-eye aria-label="Show password" aria-pressed="false">${EYE}</button></span></label>` : ''}
      ${m === 'up' ? '<label class="agree"><input type="checkbox" name="age" required> <span>I’m 13 or older and agree to the <a class="link" href="/terms.html" target="_blank">terms</a> and <a class="link" href="/privacy.html" target="_blank">privacy policy</a>.</span></label>' : ''}
      <p class="auth-err" role="alert"></p>
      <button class="btn wide" type="submit">${MODES[m].btn}</button>
    </form>
    <div class="auth-alt">
      ${m === 'up' ? '<button class="link" data-to="in">I already have an account</button>' : ''}
      ${m === 'in' ? '<button class="link" data-to="up">Create an account</button>' : ''}
      ${m === 'reset' ? '<button class="link" data-to="in">Back to sign in</button>' : ''}
    </div>`;
  const sh = openSheet(body(mode), {
    label: 'Account',
    mount(b) {
      b.addEventListener('click', e => {
        const eye = e.target.closest('[data-eye]');
        if (eye) { const inp = eye.previousElementSibling, show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; eye.setAttribute('aria-pressed', show); eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); inp.focus({ preventScroll: true }); return; }
      });
      b.addEventListener('click', e => { const to = e.target.closest('[data-to]')?.dataset.to; if (to) { b.innerHTML = body(to); b.querySelector('input')?.focus(); } });
      b.addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target, m = f.dataset.mode, err = f.querySelector('.auth-err'), btn = f.querySelector('button[type=submit]');
        const email = f.email?.value.trim(), pw = f.pw?.value;
        const fail = t => { err.textContent = t; f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); };
        if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('That email doesn’t look right.');
        if (f.pw && pw.length < 8) return fail('Use at least 8 characters.');
        if (f.pw2 && f.pw2.value !== pw) return fail('The passwords don’t match.');
        if (m === 'up' && !f.age.checked) return fail('Please confirm you’re 13 or older.');
        btn.disabled = true; btn.classList.add('busy'); err.textContent = '';
        let res;
        try {
          if (m === 'in') res = await signIn(email, pw);
          if (m === 'up') res = await signUp(email, pw);
          if (m === 'reset') res = await resetPassword(email);
          if (m === 'newpw') res = await setPassword(pw);
        } catch (x) { res = { error: x }; }
        btn.disabled = false; btn.classList.remove('busy');
        if (res.error) return fail(friendly(res.error));
        // No emails: the account is ready straight away. If the server still wants a confirmed
        // email, say so plainly instead of sending people to their inbox.
        if (m === 'up' && !res.data.session) return fail('Sign-ups are paused for a moment. Try again soon.');
        if (m === 'reset') { b.innerHTML = sent('Check your email', `If <b>${esc(email)}</b> has an account, a reset link is on its way.`); return; }
        closeSheet(sh);
        toast(m === 'newpw' ? 'Password saved.' : m === 'up' ? 'Account made. Your habits are backed up.' : 'Signed in. Syncing your habits…');
      });
    },
  });
  return sh;
}
const sent = (h, p) => `<div class="sent"><div class="sent-ic" aria-hidden="true">✉️</div><h2 class="sheet-h serif-h">${h}</h2><p class="muted">${p}</p><button class="btn ghost wide mt3" data-a="closeSheet">Done</button></div>`;

// Supabase's messages, in plain words. Never says whether an email has an account.
function friendly(e) {
  const m = (e.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Email or password is wrong.';
  if (m.includes('not confirmed')) return 'Sign-ups are paused for a moment. Try again soon.';
  if (m.includes('rate') || e.status === 429) return 'Too many tries. Wait a few minutes and try again.';
  if (m.includes('weak') || m.includes('pwned') || m.includes('password should')) return 'Pick a stronger password, one you don’t use elsewhere.';
  if (m.includes('fetch') || m.includes('network')) return 'No internet. Try again when you’re online.';
  if (m.includes('already registered')) return 'Couldn’t make that account. Try signing in instead.';
  return 'Something went wrong. Try again.';
}

export async function confirmSignOut() {
  const unsent = state.pending.length > 0;
  if (await confirmSheet('Sign out?', unsent ? `${state.pending.length} change${state.pending.length > 1 ? 's haven’t' : ' hasn’t'} reached your account yet. Go online first, or they’ll be lost.` : 'Your habits stay safe in your account. This phone’s copy is cleared.', 'Sign out', unsent)) signOut();
}
