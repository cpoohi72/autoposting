# Instagram 自動投稿アプリ - 完全テスト・解説ガイド

## 目次

1. [アプリケーション全体を通したテストフロー](#アプリケーション全体を通したテストフロー)
2. [Service Worker 動作確認テストフロー](#service-worker動作確認テストフロー)
3. [各 JS ファイルの解説](#各jsファイルの解説)
4. [アプリケーションフロー別ファイル動作](#アプリケーションフロー別ファイル動作)
5. [デバッグ用コマンド集](#デバッグ用コマンド集)

---

## アプリケーション全体を通したテストフロー

### 1. 初期セットアップ確認

- [ ] アプリが正常に起動する
- [ ] ネットワーク状態が正しく表示される（オンライン/オフライン）
- [ ] タブ切り替え（新規投稿/保存済み）が動作する

### 2. IndexedDB 初期化テスト

```javascript
// ブラウザコンソールで実行
indexedDB.databases().then((dbs) => {
  console.log(
    "利用可能なDB:",
    dbs.map((db) => db.name)
  );
});
```

- [ ] `offlinePostsDB` データベースが作成される
- [ ] `posts` オブジェクトストアが存在する

### 3. オフライン投稿保存テスト

1. 画像を選択
2. キャプションを入力
3. 「インターネット接続時に投稿」を選択
4. 投稿ボタンをクリック

**期待結果:**

- [ ] "オフライン投稿として保存されました" トースト表示
- [ ] コンソールに "投稿を IndexedDB に保存しました。ID: X" 表示
- [ ] 「保存済み」タブに投稿が表示される
- [ ] 投稿ステータスが "PENDING" になる

### 4. 予約投稿テスト

1. 画像を選択
2. キャプションを入力
3. 「日時指定」を選択
4. 15 分以上先の日時を設定
5. 投稿ボタンをクリック

**期待結果:**

- [ ] "予約投稿として保存されました" トースト表示
- [ ] 「保存済み」タブで予定日時が表示される
- [ ] 投稿ステータスが "PENDING" になる

### 5. S3 アップロード + Instagram 投稿テスト（オンライン）

1. オンライン状態を確認
2. 画像を選択
3. キャプションを入力
4. 「投稿する」を選択
5. 投稿ボタンをクリック

**期待結果:**

- [ ] コンソールに "S3 に画像をアップロード中..." 表示
- [ ] コンソールに "S3 アップロード成功: https://..." 表示
- [ ] コンソールに "Instagram コンテナ作成中..." 表示
- [ ] 投稿ステータスが "PENDING" → "UPLOADING" → "PROCESSING" → "POSTED" に変化
- [ ] "投稿が完了しました！" トースト表示

### 6. オフライン → オンライン復帰テスト

1. Chrome DevTools → Network タブ → "Offline" に設定
2. 投稿を作成・保存
3. Network タブで "No throttling" に戻す（オンライン復帰）

**期待結果:**

- [ ] "X 件の投稿を処理中..." 通知表示
- [ ] 自動的に S3 アップロード開始
- [ ] Instagram 投稿処理実行
- [ ] 投稿ステータスが "POSTED" に更新

### 7. エラーハンドリングテスト

1. 無効な AWS 認証情報でテスト
2. 無効な Instagram トークンでテスト

**期待結果:**

- [ ] 適切なエラーメッセージ表示
- [ ] 投稿ステータスが "FAILED" に更新
- [ ] アプリがクラッシュしない

---

## Service Worker 動作確認テストフロー

### 1. Service Worker 登録確認

```javascript
// ブラウザコンソールで実行
navigator.serviceWorker.getRegistrations().then((registrations) => {
  console.log("登録済み Service Workers:", registrations);
  registrations.forEach((reg) => {
    console.log("Scope:", reg.scope);
    console.log("Active:", !!reg.active);
    console.log("State:", reg.active?.state);
  });
});
```

**期待結果:**

- [ ] Service Worker が登録されている
- [ ] State が "activated" になっている
- [ ] Scope が正しい（http://localhost:3001/）

### 2. Service Worker 状態確認（DevTools）

1. Chrome DevTools → Application タブ
2. Service Workers セクション

**確認項目:**

- [ ] Status: "activated and is running"
- [ ] Source: `/sw.js`
- [ ] "Offline" チェックボックスでオフライン動作テスト可能

### 3. キャッシュ動作確認

1. Application タブ → Storage → Cache Storage
2. `offline-post-scheduler-v1` を確認

**期待結果:**

- [ ] キャッシュが作成されている
- [ ] `/` と `/manifest.json` がキャッシュされている

### 4. Background Sync 確認

```javascript
// コンソールで実行
navigator.serviceWorker.ready
  .then((registration) => {
    if (registration.sync) {
      console.log("Background Sync サポート: あり");
      return registration.sync.register("background-sync-posts");
    } else {
      console.log("Background Sync サポート: なし");
    }
  })
  .then(() => {
    console.log("Background Sync 登録成功");
  })
  .catch((error) => {
    console.error("Background Sync 登録失敗:", error);
  });
```

### 5. Service Worker メッセージング確認

**期待されるコンソールログ:**
✅ Service Worker 登録成功: http://localhost:3001/
✅ Service Worker: インストール中...
✅ Service Worker: キャッシュを開きました
✅ Service Worker: インストール完了
✅ Service Worker: アクティベーション中...
✅ Service Worker: アクティベーション完了
✅ Background Sync 登録成功: background-sync-posts

---

## 各 JS ファイルの解説

### **src/App.js**

**役割:** アプリケーションのメインコンポーネント

- タブ切り替え機能（新規投稿/保存済み）
- ネットワーク状態の監視・表示
- Service Worker 初期化
- 通知システムの管理
- オンライン復帰時の投稿処理トリガー

### **src/components/OfflinePostScheduler.js**

**役割:** 投稿作成・編集画面

- 画像アップロード機能
- キャプション入力・文字数制限
- 投稿オプション選択（即座投稿/予約投稿）
- バリデーション処理
- IndexedDB への保存
- オンライン時の即座投稿実行

### **src/components/SavedPosts.js**

**役割:** 保存済み投稿一覧表示

- IndexedDB からの投稿取得・表示
- 投稿ステータス表示
- 投稿削除機能
- 投稿一覧の更新機能

### **src/components/Notification.js**

**役割:** 通知システム

- トースト通知の表示
- 通知タイプ別スタイリング（成功/エラー/情報）
- 自動非表示機能

### **src/utils/indexedDB.js**

**役割:** ローカルデータベース管理

- IndexedDB 初期化・接続
- 投稿データの CRUD 操作
- 投稿ステータス更新
- データフィルタリング・ソート
- エラーハンドリング

### **src/utils/instagramGraphAPI.js**

**役割:** Instagram API 連携

- Instagram Graph API 呼び出し
- 投稿コンテナ作成
- 投稿公開処理
- S3 アップロード統合
- エラーハンドリング・リトライ

### **src/utils/s3Upload.js**

**役割:** AWS S3 画像アップロード

- Base64 画像データを S3 にアップロード
- 公開 URL 生成
- ファイル削除機能
- エラーハンドリング

### **src/utils/networkStatus.js**

**役割:** ネットワーク状態管理

- オンライン/オフライン状態監視
- オンライン復帰時の投稿処理
- ネットワーク変更イベント処理

### **src/utils/serviceWorker.js**

**役割:** Service Worker 管理

- Service Worker 登録・初期化
- Background Sync 管理
- メッセージング機能
- プッシュ通知対応

### **public/sw.js**

**役割:** Service Worker スクリプト

- キャッシュ管理
- オフライン対応
- Background Sync 処理
- ネットワークリクエスト制御

---

## アプリケーションフロー別ファイル動作

### **フロー 1: アプリ起動時**

src/index.js
└── src/App.js
├── src/utils/serviceWorker.js (Service Worker 初期化)
├── src/utils/networkStatus.js (ネットワーク監視開始)
└── src/components/OfflinePostScheduler.js (デフォルト表示)
└── src/utils/indexedDB.js (DB 初期化)

### **フロー 2: オフライン投稿保存**

src/components/OfflinePostScheduler.js (ユーザー入力)
└── src/utils/indexedDB.js (データ保存)
└── src/components/Notification.js (成功通知)

### **フロー 4: オンライン復帰時の自動投稿**

src/utils/networkStatus.js (オンライン検出)
├── src/utils/indexedDB.js (PENDING 投稿取得)
└── src/utils/instagramGraphAPI.js (各投稿処理)
├── src/utils/s3Upload.js (画像アップロード)
├── src/utils/indexedDB.js (ステータス更新)
└── src/components/Notification.js (処理結果通知)

### **フロー 5: 保存済み投稿表示**

src/components/SavedPosts.js (タブ切り替え)
└── src/utils/indexedDB.js (投稿一覧取得)
└── src/components/SavedPosts.js (一覧表示)

### **フロー 7: エラーハンドリング**

各処理ファイル (エラー発生)
├── src/utils/indexedDB.js (ステータス更新: FAILED)
├── src/components/Notification.js (エラー通知)
└── コンソールログ出力

---

## デバッグ用コマンド集

### IndexedDB 確認

```javascript
// データベース一覧
indexedDB.databases().then(console.log);

// 投稿データ確認
getAllPosts().then(console.log);

// 特定ステータスの投稿確認
getAllPosts("PENDING").then(console.log);

// データベース詳細確認
const request = indexedDB.open("offlinePostsDB");
request.onsuccess = (event) => {
  const db = event.target.result;
  console.log("DB名:", db.name);
  console.log("バージョン:", db.version);
  console.log("ストア一覧:", Array.from(db.objectStoreNames));
  db.close();
};
```

### Service Worker 確認

```javascript
// 登録状況確認
navigator.serviceWorker.getRegistrations().then((registrations) => {
  console.log("登録済み Service Workers:", registrations);
  registrations.forEach((reg) => {
    console.log("Scope:", reg.scope);
    console.log("Active:", !!reg.active);
    console.log("State:", reg.active?.state);
  });
});

// アクティブ状態確認
navigator.serviceWorker.ready.then((reg) => {
  console.log("Ready:", reg);
  console.log("Active Worker:", reg.active);
});

// メッセージ送信テスト
navigator.serviceWorker.ready.then((registration) => {
  if (registration.active) {
    registration.active.postMessage({
      type: "TEST_MESSAGE",
      data: "Hello from main thread",
    });
  }
});
```

### ネットワーク状態確認

```javascript
// 現在の状態
console.log("オンライン:", navigator.onLine);

// 状態変更監視
window.addEventListener("online", () => {
  console.log("オンラインになりました");
});

window.addEventListener("offline", () => {
  console.log("オフラインになりました");
});

// ネットワーク情報（対応ブラウザのみ）
if ("connection" in navigator) {
  console.log("接続タイプ:", navigator.connection.effectiveType);
  console.log("ダウンリンク:", navigator.connection.downlink);
}
```

### AWS S3 接続テスト

```javascript
// 環境変数確認
console.log("AWS Region:", process.env.REACT_APP_AWS_REGION);
console.log("S3 Bucket:", process.env.REACT_APP_AWS_S3_BUCKET_NAME);
console.log("Access Key設定済み:", !!process.env.REACT_APP_AWS_ACCESS_KEY_ID);

// S3アップロードテスト（テスト画像で）
const testImageData =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
uploadImageToS3(testImageData, "test")
  .then((url) => {
    console.log("テストアップロード成功:", url);
  })
  .catch((error) => {
    console.error("テストアップロード失敗:", error);
  });
```

### Instagram API 接続テスト

```javascript
// 環境変数確認
console.log(
  "Instagram Business ID:",
  process.env.REACT_APP_INSTAGRAM_BUSINESS_ID
);
console.log(
  "Access Token設定済み:",
  !!process.env.REACT_APP_INSTAGRAM_ACCESS_TOKEN
);

// APIテスト（実際には投稿されない確認用）
const testData = {
  image_url: "https://picsum.photos/400/400",
  caption: "テスト投稿 #test",
};

// makeContainerAPI(testData.image_url, testData.caption).then(console.log).catch(console.error);
```

### 完全な動作テスト

```javascript
// 全体的な健康チェック
const healthCheck = async () => {
  const results = {};

  // IndexedDB
  try {
    const dbs = await indexedDB.databases();
    results.indexedDB = dbs.some((db) => db.name === "offlinePostsDB");
  } catch (error) {
    results.indexedDB = false;
  }

  // Service Worker
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    results.serviceWorker = registrations.length > 0;
  } catch (error) {
    results.serviceWorker = false;
  }

  // ネットワーク
  results.network = navigator.onLine;

  // 環境変数
  results.awsConfig = !!(
    process.env.REACT_APP_AWS_REGION &&
    process.env.REACT_APP_AWS_ACCESS_KEY_ID &&
    process.env.REACT_APP_AWS_S3_BUCKET_NAME
  );

  results.instagramConfig = !!(
    process.env.REACT_APP_INSTAGRAM_BUSINESS_ID &&
    process.env.REACT_APP_INSTAGRAM_ACCESS_TOKEN
  );

  console.table(results);
  return results;
};

// 実行
healthCheck();
```

### トラブルシューティング用コマンド

```javascript
// キャッシュクリア
caches
  .keys()
  .then((cacheNames) => {
    return Promise.all(
      cacheNames.map((cacheName) => {
        console.log("削除中:", cacheName);
        return caches.delete(cacheName);
      })
    );
  })
  .then(() => {
    console.log("全てのキャッシュを削除しました");
  });

// Service Worker強制更新
navigator.serviceWorker.getRegistrations().then((registrations) => {
  registrations.forEach((registration) => {
    registration.update();
    console.log("Service Worker更新中:", registration.scope);
  });
});

// IndexedDB完全削除
indexedDB.deleteDatabase("offlinePostsDB").onsuccess = () => {
  console.log("IndexedDBを削除しました");
};
```

```

```
