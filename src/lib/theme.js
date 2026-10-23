// Looks people can pick under Me. Saved with the profile (follows the account) and in
// localStorage (so the right colours show before anything loads). Same idea as JobDone's THEMES.
export const THEMES = [
  { k: 'paper', name: 'Paper', desc: 'Warm notebook paper. Goes dark when your phone does.', sw: ['#F6F1E7', '#FF5A1F', '#1C1A17'] },
  { k: 'midnight', name: 'Midnight', desc: 'Dark all the time, with a tangerine glow.', sw: ['#151412', '#FF7A45', '#F3EEE4'] },
  { k: 'pool', name: 'Pool', desc: 'Chlorine blue and lane-rope stripes.', sw: ['#E6F4F7', '#0E8FB0', '#0B2A33'], pro: true },
  { k: 'matcha', name: 'Matcha', desc: 'Soft green tea and cream.', sw: ['#EEF2E3', '#5E8B3A', '#1F2A17'], pro: true },
];
// Habit colours: each keeps white or near-black text readable on top.
export const COLOURS = {
  tangerine: '#FF5A1F', tomato: '#E5383B', berry: '#C2185B', grape: '#7B4BC4', ocean: '#1E6FD9',
  lagoon: '#0E8FB0', mint: '#1F9D7A', leaf: '#4C9A2A', sun: '#F2B705', cocoa: '#8A5A3C',
};
export function applyTheme(k) {
  document.documentElement.dataset.theme = THEMES.some(t => t.k === k) ? k : 'paper';
  try { localStorage.setItem('keepup-theme', document.documentElement.dataset.theme); } catch (e) {}
  const bar = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar);
}
// Dark or white text, whichever reads better on a colour (from JobDone).
export function inkOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#fff';
  const n = parseInt(m[1], 16), lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
  const L = .2126 * lin(n >> 16 & 255) + .7152 * lin(n >> 8 & 255) + .0722 * lin(n & 255);
  return L > .36 ? '#1C1A17' : '#fff';
}
