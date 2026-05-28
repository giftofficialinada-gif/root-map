// ─────────────────────────────────────────────────────────
// Firebase設定ファイル
// https://console.firebase.google.com でプロジェクトを作成し
// 以下の値を入力してください。
// 入力後 git push するとGitHub Pagesにも反映されます。
// ─────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",      // 例: https://your-project-default-rtdb.firebaseio.com
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

// 上記の databaseURL が入力されていれば自動でクラウド同期が有効になります
export const isCloudSyncEnabled = Boolean(firebaseConfig.databaseURL);
