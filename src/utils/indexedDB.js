// IndexedDBのデータベース名とバージョン
const DB_NAME = 'offlinePostsDB';
const DB_VERSION = 1;
const STORE_NAME = 'posts';

// データベースを開く
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // データベースの構造をセットアップ（初回または更新時）
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 'posts'オブジェクトストアが存在しない場合は作成
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // idをキーとして、自動インクリメントを有効にする
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        
        // インデックスを作成（検索を高速化するため）
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
        objectStore.createIndex('scheduledDateTime', 'scheduledDateTime', { unique: false });
        objectStore.createIndex('postingOption', 'postingOption', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject(`データベースを開けませんでした: ${event.target.errorCode}`);
    };
  });
};

// 投稿を保存
export const savePost = async (postData) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // 現在のタイムスタンプを追加
      const post = {
        ...postData,
        createdAt: new Date().toISOString()
      };
      
      const request = store.add(post);
      
      request.onsuccess = (event) => {
        resolve(event.target.result); // 生成されたIDを返す
      };
      
      request.onerror = (event) => {
        reject(`投稿の保存に失敗しました: ${event.target.errorCode}`);
      };
    });
  } catch (error) {
    console.error('投稿の保存中にエラーが発生しました:', error);
    throw error;
  }
};

// すべての投稿を取得
export const getAllPosts = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        reject(`投稿の取得に失敗しました: ${event.target.errorCode}`);
      };
    });
  } catch (error) {
    console.error('投稿の取得中にエラーが発生しました:', error);
    throw error;
  }
};

// 投稿を削除
export const deletePost = async (id) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        reject(`投稿の削除に失敗しました: ${event.target.errorCode}`);
      };
    });
  } catch (error) {
    console.error('投稿の削除中にエラーが発生しました:', error);
    throw error;
  }
};