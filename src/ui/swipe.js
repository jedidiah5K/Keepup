// Swipe a habit row left to show Skip / Edit / Delete behind it. Swipe back, tap elsewhere or scroll to close.
// Vertical scrolling still belongs to the page (touch-action: pan-y on the rows).
import { buzz } from './feedback.js';

let open = null;          // the row that's swiped open
let drag = null;          // { row, x0, y0, base, w, on }
export let swiped = false; // true right after a swipe, so the click that ends it doesn't tick

const width = row => row.querySelector('.h-acts')?.offsetWidth || 0;
const set = (row, x, anim) => {
  row.classList.toggle('sw-anim', !!anim); row.style.setProperty('--sx', `${x}px`);
  clearTimeout(row._swT);
  if (x !== 0) row.classList.add('swiped');
  else if (anim) row._swT = setTimeout(() => row.classList.remove('swiped'), 380);   // keep it clipped while it slides back
  else row.classList.remove('swiped');
};

export function close(anim = true) {
  if (!open) return;
  const row = open; open = null; set(row, 0, anim);
  row.querySelector('.h-acts')?.setAttribute('aria-hidden', 'true');
}
function show(row, anim = true) {
  if (open && open !== row) close();
  open = row; set(row, -width(row), anim);
  row.querySelector('.h-acts')?.removeAttribute('aria-hidden');
}

document.addEventListener('pointerdown', e => {
  swiped = false;
  const row = e.target.closest('.habit'); 
  if (open && row !== open && !e.target.closest('.sheet-wrap')) close();
  if (!row || e.button > 0 || e.target.closest('.h-acts')) return;
  drag = { row, x0: e.clientX, y0: e.clientY, base: open === row ? -width(row) : 0, w: width(row), on: false };
}, { passive: true });

document.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (!drag.on) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }   // it's a scroll
    if (Math.abs(dx) < 10) return;
    drag.on = true; swiped = true;
    document.dispatchEvent(new Event('keepup:swipe'));   // cancels the hold-to-open on the circle
  }
  // Follows the finger, with a little rubber band past the end.
  let x = drag.base + dx;
  if (x > 0) x = x / 4;
  if (x < -drag.w) x = -drag.w + (x + drag.w) / 4;
  set(drag.row, x, false);
}, { passive: true });

const end = e => {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.on) return;
  const x = d.base + (e.clientX - d.x0);
  if (e.type !== 'pointercancel' && x < -Math.min(56, d.w / 3)) { if (open !== d.row) buzz(10); show(d.row); }
  else { if (open === d.row) open = null; set(d.row, 0, true); d.row.querySelector('.h-acts')?.setAttribute('aria-hidden', 'true'); }
};
document.addEventListener('pointerup', end, { passive: true });
document.addEventListener('pointercancel', end, { passive: true });
document.addEventListener('scroll', () => { if (open && !drag) close(); }, { capture: true, passive: true });
// The screen was redrawn (a sync finished, say): keep the same row open.
export function restore() {
  if (!open || open.isConnected) return;
  const row = document.querySelector(`.habit[data-id="${open.dataset.id}"]`);
  open = null; if (row && !drag) show(row, false);
}
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
