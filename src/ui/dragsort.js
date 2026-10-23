// Pointer drag for any .dsort list (from JobDone): grab a [data-drag] handle, the row follows your
// finger, the others make room. On drop a 'dsort' event bubbles with { from, to }.
function dragSort(ev) {
  const h = ev.target.closest('[data-drag]'); if (!h) return;
  const item = h.closest('[data-dragitem]'), box = item && item.parentElement; if (!box || !box.classList.contains('dsort')) return;
  ev.preventDefault();
  const items = [...box.children].filter(x => x.hasAttribute('data-dragitem')), from = items.indexOf(item);
  const rects = items.map(x => x.getBoundingClientRect()), y0 = ev.clientY, hgt = rects[from].height + (rects[1] ? Math.abs(rects[1].top - rects[0].bottom) : 8);
  let to = from;
  item.classList.add('dragging'); try { h.setPointerCapture(ev.pointerId); } catch (e) {}
  const scroller = item.closest('#screen, .sheet');
  const move = e => {
    const dy = e.clientY - y0; item.style.transform = `translateY(${dy}px)`;
    const mid = rects[from].top + rects[from].height / 2 + dy;
    to = from; items.forEach((x, i) => {
      if (i === from) return; const c = rects[i].top + rects[i].height / 2; let sh = 0;
      if (i > from && mid > c) { sh = -hgt; to = Math.max(to, i); } else if (i < from && mid < c) { sh = hgt; to = Math.min(to, i); }
      x.style.transform = sh ? `translateY(${sh}px)` : '';
    });
    if (scroller) { const r = scroller.getBoundingClientRect(); if (e.clientY < r.top + 40) scroller.scrollTop -= 8; else if (e.clientY > r.bottom - 40) scroller.scrollTop += 8; }
  };
  const up = () => {
    h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
    items.forEach(x => { x.style.transform = ''; }); item.classList.remove('dragging');
    if (to !== from) box.dispatchEvent(new CustomEvent('dsort', { bubbles: true, detail: { from, to } }));
  };
  h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
}
document.addEventListener('pointerdown', dragSort);

// Keyboard and screen-reader users move rows with the arrow keys on the handle.
document.addEventListener('keydown', e => {
  const h = e.target.closest?.('[data-drag]'); if (!h || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
  const item = h.closest('[data-dragitem]'), box = item.parentElement, items = [...box.children].filter(x => x.hasAttribute('data-dragitem'));
  const from = items.indexOf(item), to = from + (e.key === 'ArrowUp' ? -1 : 1);
  if (to < 0 || to >= items.length) return;
  e.preventDefault(); box.dispatchEvent(new CustomEvent('dsort', { bubbles: true, detail: { from, to, keyboard: true } }));
});
