// IndexedDBのデータベース名とバージョン
const DB_NAME = 'offlinePostsDB';
const DB_VERSION = 1;
const STORE_NAME = 'posts';

// 投稿ステータスの定義
export const POST_STATUS = {
  PENDING: 'pending',    // 投稿待ち
  POSTED: 'posted',      // 投稿済み
  FAILED: 'failed'       // 投稿失敗
};

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
        objectStore.createIndex('status', 'status', { unique: false });
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
      
      // 現在のタイムスタンプとステータスを追加
      const post = {
        ...postData,
        status: POST_STATUS.PENDING,
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

// 投稿のステータスを更新
export const updatePostStatus = async (id, status) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // まず投稿を取得
      const getRequest = store.get(id);
      
      getRequest.onsuccess = (event) => {
        const post = event.target.result;
        if (post) {
          // ステータスを更新
          post.status = status;
          
          // 更新した投稿を保存
          const updateRequest = store.put(post);
          
          updateRequest.onsuccess = () => {
            resolve(true);
          };
          
          updateRequest.onerror = (event) => {
            reject(`投稿の更新に失敗しました: ${event.target.errorCode}`);
          };
        } else {
          reject(`ID ${id} の投稿が見つかりませんでした`);
        }
      };
      
      getRequest.onerror = (event) => {
        reject(`投稿の取得に失敗しました: ${event.target.errorCode}`);
      };
    });
  } catch (error) {
    console.error('投稿の更新中にエラーが発生しました:', error);
    throw error;
  }
};

// すべての投稿を取得（ステータスでフィルタリング可能）
export const getAllPosts = async (status = null) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = (event) => {
        let posts = event.target.result;
        
        // ステータスが指定されている場合はフィルタリング
        if (status !== null) {
          posts = posts.filter(post => post.status === status);
        }
        
        resolve(posts);
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