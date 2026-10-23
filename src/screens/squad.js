// Squad tab. The full squad (invite link, shared habits, nudges) arrives with step 9, once
// accounts are connected. Until then this explains what's coming.
import { I } from '../ui/icons.js';

export function render() {
  return `<header class="top"><div><div class="eyebrow">2–5 friends, free</div><h1>Your <em>squad</em></h1></div></header>
    <div class="squad-empty">
      <div class="faces" aria-hidden="true"><span>🙂</span><span>😎</span><span>🤓</span><span>＋</span></div>
      <h2 class="display">Streaks are easier <em>together.</em></h2>
      <p class="muted">Make a squad, drop the link in your group chat, and pick which habits your friends can see. Everything else stays private.</p>
      <ul class="ticks">
        <li>${I.check}<span>See who's checked in today</span></li>
        <li>${I.check}<span>A squad streak that grows when everyone shows up</span></li>
        <li>${I.check}<span>Nudge a friend who hasn't (once a day, no spam)</span></li>
      </ul>
      <button class="btn wide mt3" disabled aria-disabled="true">Create a squad</button>
      <p class="muted small mt2 center">Needs an account. Sign-in is being built next.</p>
    </div>`;
}
