// "Add to Home Screen". While KeepUp is in beta this is how people install it, so make it easy:
// Android/desktop Chrome get the real install button; iPhone gets a short, drawn guide.
import { openSheet, closeSheet, toast } from './sheets.js';

let deferred = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; dispatchEvent(new Event('keepup:installable')); });
addEventListener('appinstalled', () => { deferred = null; toast('KeepUp is on your home screen.'); });

export const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ua = navigator.userAgent;
export const isIOS = () => /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const iosNotSafari = () => isIOS() && /crios|fxios|edgios/i.test(ua);
export const canInstall = () => !installed() && (!!deferred || isIOS() || /android/i.test(ua));

const KEY = 'keepup:install-hidden';
export const nudgeHidden = () => { try { return +localStorage.getItem(KEY) > Date.now(); } catch (e) { return false; } };
export const hideNudge = (days = 7) => { try { localStorage.setItem(KEY, Date.now() + days * 864e5); } catch (e) {} };

const shareIc = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/></svg>';
const addIc = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
const dotsIc = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>';

export async function install() {
  if (deferred) {
    deferred.prompt();
    const { outcome } = await deferred.userChoice.catch(() => ({}));
    deferred = null; if (outcome === 'accepted') hideNudge(3650);
    return;
  }
  const steps = isIOS()
    ? [[shareIc, iosNotSafari() ? 'Tap <b>Share</b> in the address bar' : 'In Safari, tap <b>Share</b> (or <b>•••</b>, then <b>Share</b>)'], [addIc, 'Scroll down, tap <b>Add to Home Screen</b>'], ['<b class="step-n">3</b>', 'Tap <b>Add</b>. Open KeepUp from your home screen.']]
    : [[dotsIc, 'Tap the <b>⋮ menu</b> in Chrome'], [addIc, 'Tap <b>Add to Home screen</b> or <b>Install app</b>'], ['<b class="step-n">3</b>', 'Tap <b>Install</b>. Open KeepUp from your home screen.']];
  openSheet(`<h2 class="sheet-h">Put KeepUp on your <em>home screen</em></h2>
    <p class="muted small">It opens full screen like a normal app, works offline, and keeps your streaks one tap away.</p>
    <ol class="steps">${steps.map(([ic, t], i) => `<li style="--i:${i}"><span class="step-ic">${ic}</span><span>${t}</span></li>`).join('')}</ol>
    <button class="btn wide mt3" data-a="closeSheet">Got it</button>`, { label: 'Add to Home Screen' });
}
