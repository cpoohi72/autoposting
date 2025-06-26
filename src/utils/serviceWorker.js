// Service Workerとの通信を管理するクラスApp.jsから呼び出される
class ServiceWorkerManager {
  //コンストラクタ
  constructor() {
    //Service Workerの登録情報
    this.registration = null;
    //Service Workerがサポートされているかどうか
    this.isSupported = 'serviceWorker' in navigator;
    //メッセージハンドラー(メッセージを受信したときに呼び出される関数)
    this.messageHandlers = new Map();
  }

  //registerはService Workerを登録する関数
  async register() {
    //Service Workerがサポートされていない場合
    if (!this.isSupported) {
      console.warn('Service Worker はサポートされていません');
      return false;
    }

    try {
      //Service Workerを登録
      this.registration = await navigator.serviceWorker.register('/sw.js');
      //コンソールにログを出力
      console.log('Service Worker 登録成功:', this.registration.scope);

      //Service Workerからのメッセージを受信
      //eventはメッセージのデータ
      navigator.serviceWorker.addEventListener('message', (event) => {
        //handleMessageはメッセージを処理する関数
        this.handleMessage(event.data);
      });

      //登録成功
      return true;
    } catch (error) {
      //コンソールにエラーを出力
      console.error('Service Worker 登録失敗:', error);
      return false;
    }
  }

  // メッセージハンドラーを登録
  onMessage(type, handler) {
    //メッセージハンドラーを登録
    this.messageHandlers.set(type, handler);
  }

  // Service Workerからのメッセージを処理
  handleMessage(data) {
    //メッセージハンドラーを取得
    const handler = this.messageHandlers.get(data.type);
    //メッセージハンドラーがある場合
    if (handler) {
      //メッセージハンドラーを呼び出す
      handler(data.data);
    }
  }

  // Service Workerにメッセージを送信
  async sendMessage(message) {
    //Service Workerが利用できない場合
    if (!this.registration || !this.registration.active) {
      console.warn('Service Worker が利用できません');
      return;
    }

    //Service Workerにメッセージを送信
    this.registration.active.postMessage(message);
  }

  // バックグラウンド同期を登録
  async registerBackgroundSync(tag) {
    //Background Syncがサポートされていない場合
    if (!this.registration || !this.registration.sync) {
      console.warn('Background Sync はサポートされていません');
      return false;
    }

    try {
      //Background Syncを登録
      await this.registration.sync.register(tag);
      //コンソールにログを出力
      console.log('Background Sync 登録成功:', tag);
      return true;
    } catch (error) {
      console.error('Background Sync 登録失敗:', error);
      return false;
    }
  }

  // プッシュ通知の購読
  async subscribeToPush() {
    //Push APIがサポートされていない場合
    if (!this.registration || !this.registration.pushManager) {
      console.warn('Push API はサポートされていません');
      return null;
    }

    try {
      //プッシュ通知を購読
      const subscription = await this.registration.pushManager.subscribe({
        //userVisibleOnlyはプッシュ通知を表示するためのオプション
        userVisibleOnly: true,
        //applicationServerKeyはプッシュ通知のサーバーキー
        applicationServerKey: this.urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY)
      });

      //コンソールにログを出力
      console.log('プッシュ通知購読成功:', subscription);
      return subscription;
    } catch (error) {
      console.error('プッシュ通知購読失敗:', error);
      return null;
    }
  }

  // VAPID キーの変換
  urlBase64ToUint8Array(base64String) {
    //paddingはパディング
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    //base64はベース64
    const base64 = (base64String + padding)
      //-を+に変換
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length); 

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Service Worker の更新をチェック
  async checkForUpdates() {
    if (!this.registration) {
      return false;
    }

    try {
      await this.registration.update();
      return true;
    } catch (error) {
      console.error('Service Worker 更新チェック失敗:', error);
      return false;
    }
  }
}

// シングルトンインスタンス
export const serviceWorkerManager = new ServiceWorkerManager();

// 初期化関数(App.jsから呼び出される)
export const initializeServiceWorker = async () => {
  //Service Workerを登録
  const success = await serviceWorkerManager.register();
  //登録成功
  if (success) {
    // バックグラウンド同期の設定(バックグラウンドで同期を行う)
    serviceWorkerManager.onMessage('SYNC_COMPLETE', (data) => {
      console.log('同期完了:', data);
      // UI更新などの処理
    });

    // プッシュ通知の購読（オプション）(プッシュ通知を購読する)
    await serviceWorkerManager.subscribeToPush();
  }

  return success;
};

// バックグラウンド同期をトリガー
export const triggerBackgroundSync = async () => {
  //バックグラウンド同期を登録
  return await serviceWorkerManager.registerBackgroundSync('background-sync-posts');
};

// Service Worker にメッセージを送信
export const sendMessageToServiceWorker = async (message) => {
  //Service Workerにメッセージを送信
  return await serviceWorkerManager.sendMessage(message);
};