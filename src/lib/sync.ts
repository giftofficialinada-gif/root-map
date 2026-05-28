import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, off } from 'firebase/database';
import { firebaseConfig, isCloudSyncEnabled } from './firebaseConfig';
export { isCloudSyncEnabled };
import type { Package, User } from '../types';

export type CloudData = {
  adminId: string;
  adminPassword: string;
  users: User[];
  packages: Package[];
};

let db: ReturnType<typeof getDatabase> | null = null;
let ignoreNext = false;

if (isCloudSyncEnabled) {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}

export function writeToCloud(data: CloudData) {
  if (!db) return;
  ignoreNext = true;
  set(ref(db, 'haisha'), {
    adminId: data.adminId,
    adminPassword: data.adminPassword,
    users: data.users,
    packages: data.packages,
  }).finally(() => {
    setTimeout(() => { ignoreNext = false; }, 300);
  });
}

export function subscribeToCloud(callback: (data: CloudData) => void): () => void {
  if (!db) return () => {};
  const dbRef = ref(db, 'haisha');
  const handler = onValue(dbRef, (snapshot) => {
    if (ignoreNext) return;
    const val = snapshot.val() as CloudData | null;
    if (val) callback(val);
  });
  return () => off(dbRef, 'value', handler);
}
