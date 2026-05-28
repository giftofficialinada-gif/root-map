// ─────────────────────────────────────────────────────────
// Firebase設定ファイル
// https://console.firebase.google.com でプロジェクトを作成し
// 以下の値を入力してください。
// 入力後 git push するとGitHub Pagesにも反映されます。
// ─────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: "AIzaSyBK58TLrV5VF1SiXE7cQ0JZgQqZtuy-c_E",
  authDomain: "root-map-759db.firebaseapp.com",
  databaseURL: "https://root-map-759db-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "root-map-759db",
  storageBucket: "root-map-759db.appspot.com",
  messagingSenderId: "",
  appId: "",
};

// 上記の databaseURL が入力されていれば自動でクラウド同期が有効になります
export const isCloudSyncEnabled = Boolean(firebaseConfig.databaseURL);
