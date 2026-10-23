// Small line icons (24px grid), inline so they follow the theme colour.
const s = d => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I = {
  today: s('<path d="M4 12.5l5 5L20 6.5"/>'),
  squad: s('<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9.5" r="2.6"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15 14.3c2.6-.4 4.8 1.2 5.5 4.2"/>'),
  stats: s('<path d="M5 20V11"/><path d="M12 20V5"/><path d="M19 20v-6"/>'),
  me: s('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1-3.8 4-5.8 7.5-5.8s6.5 2 7.5 5.8"/>'),
  plus: s('<path d="M12 5v14M5 12h14"/>'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  more: s('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
  left: s('<path d="M15 5l-7 7 7 7"/>'),
  right: s('<path d="M9 5l7 7-7 7"/>'),
  drag: s('<path d="M5 9h14M5 15h14"/>'),
  bell: s('<path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 004 0"/>'),
  share: s('<path d="M12 15V4"/><path d="M8 7.5L12 3.5l4 4"/><path d="M6 11H5v9h14v-9h-1"/>'),
  lock: s('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 118 0v3"/>'),
  flame: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12.6 2.4c.5 3-1 4.7-2.5 6.3C8.6 10.3 7 12 7 14.8 7 18.2 9.3 21 12.4 21c3.3 0 5.6-2.6 5.6-6 0-2.4-1.1-4.2-2.2-5.4-.2 1.4-.9 2.5-2 3.1.6-3.4-.2-7-1.2-10.3z"/></svg>',
  snow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/></svg>',
};
