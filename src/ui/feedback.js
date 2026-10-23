// Sound, haptics and confetti, ported from JobDone.
import { state } from '../lib/store.js';

const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let hapEl = null;
// Android vibrates; iPhone (iOS 18+) gives a light tap when a hidden switch is toggled.
// Inside the store apps, Capacitor Haptics takes over (see native.js).
export function buzz(ms = 12) {
  if (state.profile.haptics_on === false) return;
  try {
    if (window.KeepUpNative?.haptic) { window.KeepUpNative.haptic(ms > 20 ? 'medium' : 'light'); return; }
    if (navigator.vibrate) { navigator.vibrate(ms); return; }
    if (!IOS) return;
    if (!hapEl) {
      hapEl = document.createElement('label'); hapEl.setAttribute('aria-hidden', 'true');
      hapEl.style.cssText = 'position:fixed;left:-200px;top:0;opacity:0;pointer-events:none';
      hapEl.innerHTML = '<input type="checkbox" switch tabindex="-1">'; document.body.appendChild(hapEl);
    }
    hapEl.click();
  } catch (e) {}
}

// One Web Audio context, unlocked inside a tap, synthesised notes (no sound files).
// iPhone mixes Web Audio over music, so ticking a habit never stops someone's playlist.
const Sound = {
  ctx: null, master: null,
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 1.2;
      const lim = this.ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = .003; lim.release.value = .15;
      this.master.connect(lim).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') this.ctx.resume();
  },
  tone(freq, dur, type = 'sine', vol = .1, delay = 0) {
    const c = this.ctx, t0 = c.currentTime + delay, osc = c.createOscillator(), g = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    osc.connect(g).connect(this.master); osc.start(t0); osc.stop(t0 + dur + .02);
  },
};
['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, () => Sound.unlock(), { passive: true, capture: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden && Sound.ctx) Sound.ctx.resume(); });

function tones(notes, type = 'sine', vol = .22) {
  if (state.profile.sounds_on === false) return;
  if (!Sound.ctx) Sound.unlock();
  if (!Sound.ctx) return;
  const go = () => { for (const [f, at, len = .18] of notes) Sound.tone(f, len, type, vol * .6, at); };
  if (Sound.ctx.state === 'running') go(); else Sound.ctx.resume().then(() => Sound.ctx.state === 'running' && go(), () => {});
}
export const SOUNDS = {
  pop: () => tones([[660, 0, .09], [990, .05, .16]], 'triangle', .2),       // tick a habit
  plus: () => tones([[880, 0, .07]], 'triangle', .14),                      // +1 on a count habit
  undo: () => tones([[520, 0, .08], [390, .06, .12]], 'sine', .14),
  allDone: () => tones([[523, 0], [659, .08], [784, .16], [1047, .26, .5], [1319, .26, .5]], 'triangle', .2),
  nudge: () => tones([[784, 0, .1], [784, .14, .1]], 'square', .06),
};

// A short burst of confetti in the habit's colour (or the theme's colours).
export function confetti(n = 24, colours) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cs = getComputedStyle(document.documentElement);
  const cols = colours || ['--accent', '--done', '--freeze', '--ink'].map(v => cs.getPropertyValue(v).trim());
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i++) {
    const e = document.createElement('i');
    e.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % cols.length]};--x:${(Math.random() - .5) * 160}px;--r:${(Math.random() - .5) * 900}deg;--d:${1.1 + Math.random() * .9}s;animation-delay:${Math.random() * .25}s;transform:scale(${.7 + Math.random() * .8})`;
    box.appendChild(e);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 2600);
}

// A small burst from one point (the tick button), for every check-in.
export function burst(el, colour) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !el) return;
  const r = el.getBoundingClientRect(), box = document.createElement('div');
  box.className = 'burst'; box.setAttribute('aria-hidden', 'true');
  box.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px`;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.random() * .4, d = 28 + Math.random() * 18, e = document.createElement('i');
    e.style.cssText = `background:${colour};--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d}px`;
    box.appendChild(e);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 700);
}
