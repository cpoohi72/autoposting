// Service Workerのバージョン
const CACHE_NAME = 'offline-post-scheduler-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Service Workerのインストール
this.addEventListener('install', (event) => {
  console.log('Service Worker: インストール中...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: インストール完了');
        // 新しいService Workerを即座にアクティブにする
        return this.skipWaiting();
      })
  );
});

// Service Workerのアクティベーション
this.addEventListener('activate', (event) => {
  console.log('Service Worker: アクティベーション中...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 古いキャッシュを削除
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: アクティベーション完了');
      // 全てのクライアントを即座に制御下に置く
      return this.clients.claim();
    })
  );
});

// ネットワークリクエストの処理
this.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにある場合はそれを返す
        if (response) {
          return response;
        }
        
        // キャッシュにない場合はネットワークから取得
        return fetch(event.request).then((response) => {
          // レスポンスが有効でない場合はそのまま返す
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // レスポンスをクローンしてキャッシュに保存
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(() => {
        // ネットワークエラーの場合、オフラインページを返す
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// バックグラウンド同期
this.addEventListener('sync', (event) => {
  console.log('Service Worker: バックグラウンド同期:', event.tag);
  
  if (event.tag === 'background-sync-posts') {
    event.waitUntil(syncPosts());
  }
});

// 投稿の同期処理
async function syncPosts() {
  try {
    console.log('Service Worker: 投稿同期開始');
    
    // IndexedDBから未投稿の投稿を取得
    const posts = await getPendingPosts();
    
    for (const post of posts) {
      try {
        // 投稿をAPIに送信
        await sendPostToAPI(post);
        
        // 成功したら投稿のステータスを更新
        await updatePostStatus(post.id, 'posted');
        
        console.log('Service Worker: 投稿成功:', post.id);
      } catch (error) {
        console.error('Service Worker: 投稿失敗:', post.id, error);
        
        // 失敗したら投稿のステータスを更新
        await updatePostStatus(post.id, 'failed');
      }
    }
    
    // クライアントに同期完了を通知
    const clients = await this.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { syncedPosts: posts.length }
      });
    });
    
  } catch (error) {
    console.error('Service Worker: 同期処理エラー:', error);
  }
}

// IndexedDBから未投稿の投稿を取得（簡略版）
async function getPendingPosts() {
  // 実際の実装では、IndexedDBから未投稿の投稿を取得
  return [];
}

// 投稿をAPIに送信（簡略版）
async function sendPostToAPI(post) {
  // 実際の実装では、APIエンドポイントに投稿を送信
  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(post)
  });
  
  if (!response.ok) {
    throw new Error('投稿の送信に失敗しました');
  }
  
  return response.json();
}

// 投稿のステータスを更新（簡略版）
async function updatePostStatus(postId, status) {
  // 実際の実装では、IndexedDBの投稿ステータスを更新
  console.log(`投稿 ${postId} のステータスを ${status} に更新`);
}

// プッシュ通知の処理
this.addEventListener('push', (event) => {
  console.log('Service Worker: プッシュ通知受信');
  
  const options = {
    body: event.data ? event.data.text() : 'プッシュ通知',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '確認',
        icon: '/check-icon.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/close-icon.png'
      }
    ]
  };
  
  event.waitUntil(
    this.registration.showNotification('オフライン予約投稿', options)
  );
});

// 通知クリックの処理
this.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: 通知クリック:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // アプリを開く
    event.waitUntil(
      this.openWindow('/')
    );
  }
});