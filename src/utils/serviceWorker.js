// Service Workerとの通信を管理するクラス
class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.isSupported = 'serviceWorker' in navigator;
    this.messageHandlers = new Map();
  }

  // Service Workerを登録
  async register() {
    if (!this.isSupported) {
      console.warn('Service Worker はサポートされていません');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker 登録成功:', this.registration.scope);

      // Service Workerからのメッセージを受信
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });

      return true;
    } catch (error) {
      console.error('Service Worker 登録失敗:', error);
      return false;
    }
  }

  // メッセージハンドラーを登録
  onMessage(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  // Service Workerからのメッセージを処理
  handleMessage(data) {
    const handler = this.messageHandlers.get(data.type);
    if (handler) {
      handler(data.data);
    }
  }

  // Service Workerにメッセージを送信
  async sendMessage(message) {
    if (!this.registration || !this.registration.active) {
      console.warn('Service Worker が利用できません');
      return;
    }

    this.registration.active.postMessage(message);
  }

  // バックグラウンド同期を登録
  async registerBackgroundSync(tag) {
    if (!this.registration || !this.registration.sync) {
      console.warn('Background Sync はサポートされていません');
      return false;
    }

    try {
      await this.registration.sync.register(tag);
      console.log('Background Sync 登録成功:', tag);
      return true;
    } catch (error) {
      console.error('Background Sync 登録失敗:', error);
      return false;
    }
  }

  // プッシュ通知の購読
  async subscribeToPush() {
    if (!this.registration || !this.registration.pushManager) {
      console.warn('Push API はサポートされていません');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY)
      });

      console.log('プッシュ通知購読成功:', subscription);
      return subscription;
    } catch (error) {
      console.error('プッシュ通知購読失敗:', error);
      return null;
    }
  }

  // VAPID キーの変換
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
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

// 初期化関数
export const initializeServiceWorker = async () => {
  const success = await serviceWorkerManager.register();
  
  if (success) {
    // バックグラウンド同期の設定
    serviceWorkerManager.onMessage('SYNC_COMPLETE', (data) => {
      console.log('同期完了:', data);
      // UI更新などの処理
    });

    // プッシュ通知の購読（オプション）
    // await serviceWorkerManager.subscribeToPush();
  }

  return success;
};

// バックグラウンド同期をトリガー
export const triggerBackgroundSync = async () => {
  return await serviceWorkerManager.registerBackgroundSync('background-sync-posts');
};

// Service Worker にメッセージを送信
export const sendMessageToServiceWorker = async (message) => {
  return await serviceWorkerManager.sendMessage(message);
};