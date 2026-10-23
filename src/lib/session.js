// Account state that screens can read without loading the Supabase library (that loads after first paint).
export const cloud = { user: null, syncing: false, lastSync: null, error: null };
// Signed in on this phone before? Read the saved session straight away so the app doesn't flash
// the sign-in screen while the account code loads. The account code checks it properly after.
try { const s = JSON.parse(localStorage.getItem('keepup-auth') || 'null'); if (s?.user?.id) cloud.user = s.user; } catch (e) {}

export function syncLine() {
  if (!cloud.user) return '';
  if (cloud.syncing) return 'Syncing…';
  if (!navigator.onLine) return 'Offline. Changes are saved and will sync later.';
  if (cloud.error) return 'Couldn’t sync. Will try again.';
  if (cloud.lastSync) return 'Backed up';
  return 'Signed in';
}

// Load the account code only when needed.
export const loadCloud = () => import('./cloud.js');
