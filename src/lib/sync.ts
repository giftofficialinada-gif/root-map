import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, Database } from 'firebase/database';
import { firebaseConfig, isCloudSyncEnabled } from './firebaseConfig';
export { isCloudSyncEnabled };
import type { Package, User } from '../types';

// Firebase は配列をオブジェクト { "0": ..., "1": ... } に変換するため
// 保存時はオブジェクト形式に、読み込み時は配列に変換する
type CloudRaw = {
  adminId?: string;
  adminPassword?: string;
  users?: Record<string, string>;         // { name: pin }
  packages?: Record<string, Package>;     // { id: Package }
};

export type CloudData = {
  adminId: string;
  adminPassword: string;
  users: User[];
  packages: Package[];
};

let db: Database | null = null;
let ignoreNext = false;

try {
  if (isCloudSyncEnabled) {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
} catch (e) {
  console.warn('[sync] Firebase 初期化エラー（オフラインで動作します）:', e);
}

export function writeToCloud(data: CloudData) {
  if (!db) return;
  try {
    // 配列 → オブジェクトに変換してから保存
    const usersObj: Record<string, string> = {};
    for (const u of data.users) usersObj[u.name] = u.pin;

    const packagesObj: Record<string, Package> = {};
    for (const p of data.packages) packagesObj[p.id] = p;

    ignoreNext = true;
    set(ref(db, 'haisha'), {
      adminId: data.adminId,
      adminPassword: data.adminPassword,
      users: usersObj,
      packages: packagesObj,
    }).then(() => {
      setTimeout(() => { ignoreNext = false; }, 500);
    }).catch((err) => {
      ignoreNext = false;
      console.warn('[sync] 書き込みエラー:', err);
    });
  } catch (e) {
    ignoreNext = false;
    console.warn('[sync] writeToCloud エラー:', e);
  }
}

export function subscribeToCloud(callback: (data: CloudData) => void): () => void {
  if (!db) return () => {};
  try {
    const dbRef = ref(db, 'haisha');
    // onValue は unsubscribe 関数を返す（Firebase v9 modular API）
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (ignoreNext) return;
        const raw = snapshot.val() as CloudRaw | null;
        if (!raw) return;

        // オブジェクト → 配列に変換して返す
        // 旧形式: {"0":{name,pin},"1":{name,pin}} / 新形式: {name:pin}
        const users: User[] = raw.users
          ? Object.entries(raw.users).map(([key, val]) =>
              typeof val === 'string'
                ? { name: key, pin: val }           // 新形式
                : (val as unknown as User)           // 旧形式（Firebaseが配列をオブジェクト化）
            )
          : [];
        const packages: Package[] = raw.packages
          ? Object.values(raw.packages)
          : [];

        callback({
          adminId: raw.adminId ?? 'admin',
          adminPassword: raw.adminPassword ?? 'admin1234',
          users,
          packages,
        });
      },
      (err) => {
        console.warn('[sync] リスナーエラー:', err);
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('[sync] subscribe エラー:', e);
    return () => {};
  }
}
