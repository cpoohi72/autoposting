// Service Workerのバージョン
//CACHE_NAMEはキャッシュの名前。バージョン管理に使用。
const CACHE_NAME = 'offline-post-scheduler-v1';
//urlsToCacheはキャッシュするURLの配列。
const urlsToCache = [
  '/',
  '/static/js/bundle.js',//バンドルされたJavaScriptファイル
  '/static/css/main.css',//メインのCSSファイル
  '/manifest.json',//PWAの設定ファイル
];

// Service Workerのインストール(installイベントを受け取る)
this.addEventListener('install', (event) => {
  console.log('Service Worker: インストール中...');
  //event.waitUntilはイベントが完了するまで待つ。
  event.waitUntil(
    //caches.openはキャッシュを開く。
    caches.open(CACHE_NAME)
      //キャッシュが開いたら実行
    .then((cache) => {
        console.log('Service Worker: キャッシュを開きました');
        //cache.addAllはキャッシュを追加する。urlsToCacheのURLをキャッシュに追加する。
        return cache.addAll(urlsToCache);
      })
      //キャッシュの追加が完了したら実行
      .then(() => {
        console.log('Service Worker: インストール完了');
        // 新しいService Workerを即座にアクティブにする。
        //skipWaitingは新しいService Workerを即座にアクティブにする。
        return this.skipWaiting();
      })
  );
});

// Service Workerのアクティベーション
//activateはService Workerが実際に動作を開始する直前に実行される処理
this.addEventListener('activate', (event) => {
  console.log('Service Worker: アクティベーション中...');
  //イベントが完了するまで待つ。
  event.waitUntil(
    //caches.keysでキャッシュの名前の配列を取得。
    caches.keys().then((cacheNames) => {
      //Promise.allは複数のPromiseを並行して実行する。
      //Promise.allとは複数の非同期処理を並行して実行し、全て完了するまで待つ関数
      return Promise.all(
        //cacheNames.mapはcacheNamesの要素を一つずつ取り出し、それをcacheNameに代入。
        cacheNames.map((cacheName) => {
          //cacheNameがCACHE_NAMEと異なる場合は古いキャッシュを削除。
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
//fetchはネットワークリクエストの処理
this.addEventListener('fetch', (event) => {
  //ネットワークリクエストの処理
  event.respondWith(
    //キャッシュを取得
    caches.match(event.request)
    //↑の処理が完了したら(responseはキャッシュの内容)
      .then((response) => {
        // キャッシュがある場合はそれを返す
        if (response) {
          return response;
        }
        
        // キャッシュがない場合はネットワークから取得
        return fetch(event.request).then((response) => {
          // レスポンスが有効でない場合はそのまま返す
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // レスポンスをクローンしてキャッシュに保存
          const responseToCache = response.clone();
          //キャッシュを開く
          caches.open(CACHE_NAME)
            .then((cache) => {
              //キャッシュに保存(event.requestはリクエストの内容, responseToCacheはレスポンスの内容)
              cache.put(event.request, responseToCache);
            });
          //レスポンスを返す
          return response;
        });
      })
      //catchはPromiseのエラーの処理
      .catch(() => {
        // ネットワークエラーの場合、オフラインページを返す
        if (event.request.destination === 'document') {
          //オフラインページを返す
          return caches.match('/');
        }
      })
  );
});

// バックグラウンド同期
//syncはバックグラウンド同期の処理
this.addEventListener('sync', (event) => {
  console.log('Service Worker: バックグラウンド同期:', event.tag);
  //event.tagはバックグラウンド同期のタグ
  if (event.tag === 'background-sync-posts') {
    //バックグラウンド同期の処理
    //event.waitUntilはバックグラウンド処理を確実に完了させるための仕組み
    //syncPostsは投稿の同期処理が確実に終わるまでservice worker処理を終了させないようにする
    event.waitUntil(syncPosts());
  }
});

// 投稿の同期処理
async function syncPosts() {
  try {
    console.log('Service Worker: 投稿同期開始');
    
    // IndexedDBから未投稿の投稿を取得
    const posts = await getPendingPosts();
    //postsは未投稿の投稿の配列
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
    //clientsはクライアントの配列
    clients.forEach(client => {
      //client.postMessageはクライアントにメッセージを送信
      //typeはメッセージの種類, dataはメッセージの内容
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

// 投稿をAPIに送信する関数
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
//pushはプッシュ通知の処理
this.addEventListener('push', (event) => {
  console.log('Service Worker: プッシュ通知受信');

  //optionsはプッシュ通知のオプション
  const options = {
    //bodyはプッシュ通知の内容
    body: event.data ? event.data.text() : 'プッシュ通知',
    //iconはプッシュ通知のアイコン
    icon: '/icon-192x192.png',
    //badgeはプッシュ通知のバッジ
    badge: '/badge-72x72.png',
    //vibrateはプッシュ通知の振動
    vibrate: [100, 50, 100],
    //dataはプッシュ通知のデータ
    data: {
      //dateOfArrivalはプッシュ通知の到着日時
      dateOfArrival: Date.now(),
      //primaryKeyはプッシュ通知の主キー
      primaryKey: 1
    },
    //actionsはプッシュ通知のアクション
    actions: [
      {
        //actionはプッシュ通知のアクション
        action: 'explore',
        //titleはプッシュ通知のタイトル
        title: '確認',
        icon: '/check-icon.png'
      },
      {
        //actionはプッシュ通知のアクション
        action: 'close',
        //titleはプッシュ通知のタイトル
        title: '閉じる',
        icon: '/close-icon.png'
      }
    ]
  };
  //event.waitUntilはプッシュ通知を表示するまで待つ
  event.waitUntil(
    //this.registration.showNotificationはプッシュ通知を表示する
    this.registration.showNotification('オフライン予約投稿', options)
  );
});

// 通知クリックの処理
//notificationclickは通知クリックの処理
this.addEventListener('notificationclick', (event) => {
  //event.actionは通知クリックのアクション
  console.log('Service Worker: 通知クリック:', event.action);
  //event.notification.closeは通知を閉じる
  event.notification.close();
  //event.actionがexploreの場合はアプリを開く
  if (event.action === 'explore') {
    //event.waitUntilはアプリを開くまで待つ
    event.waitUntil(
      //this.openWindowはアプリを開く
      this.openWindow('/')
    );
  }
});