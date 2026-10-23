// Notifications for the home-screen app. Turning them on saves this phone's push address to the
// account; the server (supabase/functions/keepup-reminders) sends habit reminders and the evening
// check to it. On iPhone this only works once KeepUp is added to the Home Screen (iOS 16.4+).
import { sb, cloud } from './cloud.js';

// The public half of the server's signing key (meant to be public, like the publishable key).
const VAPID = 'BORGzc8GcB6ejw1geJWeN_m6AT6cuMqq8ZBP69uKCt9d1Hvmt1tBv8DlGorkYaqlbOxnELJyzMW3gFUle4f138c';

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ios = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// 'on' | 'off' | 'blocked' | 'install' (iPhone, not on the Home Screen yet) | 'unsupported'
export async function pushState() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return ios() && !standalone() ? 'install' : 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

const b64 = s => Uint8Array.from(atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

// Must be called straight from a tap (iPhone only asks for permission then).
export async function enablePush() {
  if (!cloud.user) throw new Error('signin');
  if (await Notification.requestPermission() !== 'granted') return 'blocked';
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) });
  const j = sub.toJSON();
  const { error } = await sb.rpc('keepup_save_push', { endpoint: j.endpoint, keys: j.keys, label: label() });
  if (error) { await sub.unsubscribe().catch(() => {}); throw error; }
  reg.showNotification('Notifications are on', { body: 'Reminders will show up like this.', tag: 'keepup-hello', icon: '/icons/icon-192.png' }).catch(() => {});
  return 'on';
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await sb.from('keepup_push_tokens').delete().eq('token', sub.endpoint);
  await sub.unsubscribe().catch(() => {});
}

function label() {
  const u = navigator.userAgent;
  return (/iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : 'Browser').slice(0, 60);
}
