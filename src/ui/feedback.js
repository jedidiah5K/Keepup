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
  // A wooden mallet note: a sine with a quick bright partial on top that dies fast.
  mallet(freq, delay = 0, vol = .2, len = .5) {
    const c = this.ctx, t0 = c.currentTime + delay;
    for (const [mult, v, d] of [[1, vol, len], [4, vol * .22, .09], [2.01, vol * .18, len * .5]]) {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(freq * mult, t0);
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + .006); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
      o.connect(g).connect(this.master); o.start(t0); o.stop(t0 + d + .03);
    }
  },
  // Soft air, for sheets and theme changes.
  whoosh(delay = 0, vol = .05, len = .32, up = true) {
    const c = this.ctx, t0 = c.currentTime + delay, n = Math.floor(c.sampleRate * len), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); src.buffer = buf;
    f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(up ? 500 : 2400, t0); f.frequency.exponentialRampToValueAtTime(up ? 2400 : 500, t0 + len);
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + len * .4); g.gain.exponentialRampToValueAtTime(.0001, t0 + len);
    src.connect(f).connect(g).connect(this.master); src.start(t0);
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
function play(fn) {
  if (state.profile.sounds_on === false) return;
  if (!Sound.ctx) Sound.unlock();
  if (!Sound.ctx) return;
  if (Sound.ctx.state === 'running') fn(); else Sound.ctx.resume().then(() => Sound.ctx.state === 'running' && fn(), () => {});
}
// Each habit ticked today plays the next note of a pentatonic scale, so finishing the day
// climbs a little tune, like the trail climbs the mountain.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
export const SOUNDS = {
  step: n => play(() => Sound.mallet(SCALE[Math.min(n, SCALE.length - 1)], 0, .26)),
  tap: () => play(() => Sound.mallet(1567.98, 0, .045, .06)),                  // tabs, small buttons
  sheet: () => play(() => Sound.whoosh(0, .035, .26)),
  theme: () => play(() => { Sound.whoosh(0, .05, .5); Sound.mallet(783.99, .18, .08, .6); }),
  summit: () => play(() => { [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => Sound.mallet(f, i * .075, .2, .9)); Sound.whoosh(.35, .03, .8); }),
  milestone: () => play(() => { [[392, 0], [523.25, .12], [659.25, .24], [783.99, .36], [1046.5, .52]].forEach(([f, t]) => Sound.mallet(f, t, .24, 1.1)); [1046.5, 1318.51, 1567.98].forEach(f => Sound.mallet(f, .52, .12, 1.4)); }),
  pop: () => tones([[660, 0, .09], [990, .05, .16]], 'triangle', .2),       // tick a habit
  plus: () => tones([[880, 0, .07]], 'triangle', .14),                      // +1 on a count habit
  undo: () => tones([[520, 0, .08], [390, .06, .12]], 'sine', .14),
  allDone: () => tones([[523, 0], [659, .08], [784, .16], [1047, .26, .5], [1319, .26, .5]], 'triangle', .2),
  five: () => play(() => { Sound.mallet(1046.5, 0, .2, .35); Sound.mallet(1567.98, .07, .16, .6); }),
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

// Streak milestones get their own moment: the number in big serif, a sound, confetti.
export const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365, 500, 1000];
const LINES = { 3: 'Three in a row. It’s starting.', 7: 'A full week. That’s a habit forming.', 14: 'Two weeks strong.', 21: 'Three weeks. This is who you are now.',
  30: 'A whole month. Most people never get here.', 50: 'Fifty. Quietly impressive.', 75: 'Seventy-five days.', 100: 'One hundred days. Legendary.', 365: 'A full year. Unreal.' };
export function celebrate(n, habit, colour, line, iconHtml = '') {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.createElement('div'); el.className = 'milestone'; el.setAttribute('role', 'status');
  el.style.setProperty('--mc', colour || 'var(--accent)');
  el.innerHTML = `<div class="ms-card"><span class="ms-ring" aria-hidden="true"></span><span class="ms-n">${n}</span><span class="ms-unit">day streak</span>
    <span class="ms-habit">${iconHtml ? `<span class="ms-ic">${iconHtml}</span>` : ''}${habit.replace(/[&<>"]/g, '')}</span><span class="ms-line">${line || LINES[n] || 'Keep going.'}</span></div>`;
  document.body.appendChild(el);
  SOUNDS.milestone(); buzz(40); setTimeout(() => confetti(48), 350);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 400); };
  el.addEventListener('click', close); setTimeout(close, 3200);
}
