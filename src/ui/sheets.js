// Toasts and bottom sheets, ported from JobDone (pull a sheet down to close it, like iOS).
import { SOUNDS } from './feedback.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastT = null;
export function toast(html, ms = 2600) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.innerHTML = html.includes('t-one') ? html : `<span>${html}</span>`; // one text block, so flex never splits words
  document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), ms);
}

const SHEETS = [];
export function openSheet(html, opts = {}) {
  const root = document.getElementById('sheets');
  const wrap = document.createElement('div'); wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="scrim" data-a="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(opts.label || 'Sheet')}"><div class="grab"></div><div class="sheet-body">${html}</div></div>`;
  root.appendChild(wrap); SOUNDS.sheet();
  const sh = { el: wrap, opts }; SHEETS.push(sh);
  dragToDismiss(sh);
  if (opts.mount) opts.mount(wrap.querySelector('.sheet-body'), sh);
  const first = wrap.querySelector('[autofocus]'); if (first) setTimeout(() => first.focus(), 50);
  return sh;
}
function dragToDismiss(sh) {
  const el = sh.el.querySelector('.sheet'); let y0 = null, x0 = 0, dy = 0, on = false;
  el.addEventListener('touchstart', e => { if (el.scrollTop > 0 || e.target.closest('textarea, input, .dsort')) { y0 = null; return; } y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0; on = false; }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (y0 == null) return; const t = e.touches[0]; dy = t.clientY - y0;
    if (!on && (dy < 8 || Math.abs(t.clientX - x0) > dy)) { if (dy < -4) y0 = null; return; }
    on = true; el.style.transition = 'none'; el.style.transform = `translateY(${Math.max(0, dy)}px)`; if (e.cancelable) e.preventDefault();
  }, { passive: false });
  el.addEventListener('touchend', () => {
    if (!on) { y0 = null; return; }
    el.style.transition = 'transform .25s cubic-bezier(.2,.9,.25,1)';
    if (dy > 110) { el.style.transform = 'translateY(100%)'; setTimeout(() => closeSheet(sh), 200); } else el.style.transform = '';
    y0 = null; on = false;
  });
}
export function closeSheet(sh) {
  sh = sh || SHEETS[SHEETS.length - 1]; if (!sh) return;
  SHEETS.splice(SHEETS.indexOf(sh), 1); sh.el.remove();
  if (sh.opts.onClose) sh.opts.onClose();
}
export const sheetOpen = () => SHEETS.length > 0;
addEventListener('keydown', e => { if (e.key === 'Escape' && SHEETS.length) closeSheet(); });

// A yes/no question in a sheet. Resolves true when confirmed.
export function confirmSheet(title, body, yes = 'Delete', danger = true) {
  return new Promise(res => {
    let answered = false;
    const sh = openSheet(`<h2 class="sheet-h">${esc(title)}</h2><p class="muted">${esc(body)}</p>
      <div class="row gap mt3"><button class="btn ghost grow" data-x="no">Cancel</button><button class="btn grow ${danger ? 'danger' : ''}" data-x="yes">${esc(yes)}</button></div>`,
      { label: title, onClose: () => { if (!answered) res(false); },
        mount: b => b.addEventListener('click', e => { const x = e.target.closest('[data-x]'); if (!x) return; answered = true; res(x.dataset.x === 'yes'); closeSheet(sh); }) });
  });
}
