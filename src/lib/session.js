// Account state that screens can read without loading the Supabase library (that loads after first paint).
export const cloud = { user: null, syncing: false, lastSync: null, error: null };

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
