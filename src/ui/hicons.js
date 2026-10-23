// Drawn habit icons (24px grid, 1.8px line), stored on a habit as 'i:<name>'. Emoji still work:
// anything that isn't 'i:…' is shown as typed.
const s = d => `<svg class="hi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const HICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  water: '<path d="M12 3.5c3.2 4 5.5 7.2 5.5 10.2a5.5 5.5 0 01-11 0c0-3 2.3-6.2 5.5-10.2z"/><path d="M9.5 14.5a2.6 2.6 0 002.4 2.4"/>',
  run: '<circle cx="14.5" cy="4.8" r="1.8"/><path d="M8 20l2.8-5 2.7 2V21"/><path d="M6.5 11.5l2.8-3h4l2.2 3.2 2.5.8"/><path d="M9.3 8.5l1.5 6.5"/>',
  lift: '<path d="M3.5 9v6M6.5 7v10M17.5 7v10M20.5 9v6M6.5 12h11"/>',
  book: '<path d="M4 5.5c2.6-.8 5.4-.5 8 1.2v12.8c-2.6-1.7-5.4-2-8-1.2z"/><path d="M20 5.5c-2.6-.8-5.4-.5-8 1.2v12.8c2.6-1.7 5.4-2 8-1.2z"/>',
  calm: '<path d="M12 6c1.8 2 2.6 4 2.6 6.2S13.6 16 12 17.5c-1.6-1.5-2.6-3.1-2.6-5.3S10.2 8 12 6z"/><path d="M8.6 10.2C6.4 9.6 4.6 10 3.5 11c1 3.6 4 6.4 8.5 6.5"/><path d="M15.4 10.2c2.2-.6 4-.2 5.1.8-1 3.6-4 6.4-8.5 6.5"/>',
  sleep: '<path d="M19 14.5A7.5 7.5 0 019.5 5a7.5 7.5 0 109.5 9.5z"/><path d="M15 4h3l-3 3.5h3"/>',
  walk: '<path d="M8.5 13.5c-1.6-.2-2.6-1.8-2.4-4 .2-2.4 1.4-4 2.9-3.9 1.5.2 2.2 2.1 2 4.5-.2 1.9-.9 3.5-2.5 3.4z"/><path d="M7.4 16.5l2.6.4-.3 2.3a1.3 1.3 0 01-2.6-.4z"/><path d="M15.5 9.5c1.6-.2 2.6 1.4 2.5 3.6-.2 2.4-1.4 4-2.9 3.9-1.5-.2-2.2-2.1-2-4.5"/><path d="M16.6 19.5l-2.6.4.3 2.3"/>',
  food: '<path d="M19.5 4.5C11 4.5 5 9 5 15.5c0 1.7.5 3 1.2 4 5.8 0 13.3-4.2 13.3-15z"/><path d="M5 20l7-7"/>',
  skin: '<rect x="8" y="9" width="8" height="11.5" rx="2.5"/><path d="M10 9V6.5h4V9M11 3.5h4.5"/><path d="M14 3.5v3"/>',
  nophone: '<rect x="7.5" y="3.5" width="9" height="17" rx="2.2"/><path d="M11 17.5h2"/><path d="M4 4l16 16"/>',
  write: '<path d="M14.5 5.5l4 4L9 19l-5 1 1-5z"/><path d="M12.5 7.5l4 4"/>',
  music: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.8" cy="17.5" r="2.2"/><circle cx="16.8" cy="15.5" r="2.2"/>',
  mind: '<path d="M9.5 17.5h5M10.5 20.5h3"/><path d="M12 3.5a5.5 5.5 0 00-3.3 9.9c.8.6 1.3 1.6 1.3 2.6v.5h4V16c0-1 .5-2 1.3-2.6A5.5 5.5 0 0012 3.5z"/>',
  teeth: '<path d="M7.5 4C5.3 4 4 5.8 4 8c0 2.5 1.3 4 1.8 6.8.5 3 1 5.7 2.4 5.7 1.5 0 1.3-4.5 3.8-4.5s2.3 4.5 3.8 4.5c1.4 0 1.9-2.7 2.4-5.7.5-2.8 1.8-4.3 1.8-6.8 0-2.2-1.3-4-3.5-4-1.8 0-2.6 1-4.5 1S9.3 4 7.5 4z"/>',
  pill: '<rect x="3.3" y="8.5" width="17.4" height="7" rx="3.5" transform="rotate(-40 12 12)"/><path d="M9.6 9.2l5 5" transform="rotate(5 12 12)"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
  bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l3.5 7H6M13 6h3"/>',
  tidy: '<path d="M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6z"/><path d="M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7zM6 16.5l.5 1.3 1.3.5-1.3.5L6 20l-.5-1.3-1.3-.5 1.3-.5z"/>',
  money: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.5-1-1.6-1.6-2.8-1.6-1.6 0-2.8.9-2.8 2.2 0 3 5.6 1.6 5.6 4.5 0 1.3-1.2 2.2-2.8 2.2-1.3 0-2.4-.6-2.9-1.7M12 6v1.6M12 16.4V18"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7a4.3 4.3 0 017.5 2.8C19.5 15.4 12 20 12 20z"/>',
  code: '<path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.5 5l-3 14"/>',
  plant: '<path d="M7 14.5h10l-1.3 6H8.3z"/><path d="M12 14.5V10"/><path d="M12 10c0-3.3 2.3-5.5 6-5.5 0 3.5-2.4 5.5-6 5.5zM12 11.5C12 8.8 10.1 7 7 7c0 2.9 2 4.5 5 4.5z"/>',
  cup: '<path d="M5 8.5h11v5.5a5 5 0 01-5 5h-1a5 5 0 01-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 010 5H16"/><path d="M8.5 3.5c-.6 1 .6 1.6 0 2.6M12 3.5c-.6 1 .6 1.6 0 2.6"/>',
  study: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4.3c1.4 1.4 3.4 2.2 5.5 2.2s4.1-.8 5.5-2.2v-4.3M21.5 9.5v5"/>',
  call: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 005.9 5.9l1.5-2 4 1.5v3a2 2 0 01-2.2 2A16.5 16.5 0 014.5 5.7a2 2 0 012-2.2z"/>',
};
export const HICON_NAMES = Object.keys(HICONS);

const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const isDrawn = icon => typeof icon === 'string' && icon.startsWith('i:') && HICONS[icon.slice(2)];
// The icon as HTML: a drawn SVG, or the emoji as text.
export const hi = icon => isDrawn(icon) ? s(HICONS[icon.slice(2)]) : esc(icon || '✓');
// The SVG on its own (for the share card, which draws it onto a canvas).
export const hiSVG = (icon, colour) => isDrawn(icon) ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${HICONS[icon.slice(2)]}</svg>` : null;
