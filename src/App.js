//必要ライブラリのインポート
import React, { useState, useEffect } from 'react';

//コンポーネントのインポート・importの後の変数名として扱えるようにする
import OfflinePostScheduler from './components/OfflinePostScheduler';
import SavedPosts from './components/SavedPosts';
import Notification from './components/Notification';

//ネットワーク状態の監視と投稿の処理。{ }の中にはコンポーネント内の関数名が入る。
import { setupNetworkMonitoring, processPostsWhenOnline } from './utils/networkStatus';
import { initializeServiceWorker, triggerBackgroundSync } from './utils/serviceWorker';

//Appコンポーネントの定義
function App() {
  //useStateはReactのフック。状態を管理するための関数。()の中には初期値が入る。
  //タブの状態を管理
  const [activeTab, setActiveTab] = useState('create');
  //ネットワーク状態を管理
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  //通知の状態を管理
  const [notification, setNotification] = useState(null);
  //Service Workerの準備状態を管理
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  // ネットワーク状態の監視
  //useEffectはReactのフック。副作用を管理するための関数。()の中には副作用を管理するための関数が入る。
  useEffect(() => {
    //ページのロード時に実行。ネットワーク状態の監視を開始
    const cleanup = setupNetworkMonitoring((online) => {
      //ネットワーク状態を更新
      setIsOnline(online);
      
      // オンラインになったときに投稿を処理。
      if (online) {
        //processPostsWhenOnlineはnetworkStatus.jsの関数。
        //オンラインになった時に投稿を処理する
        processPostsWhenOnline(setNotification);
      }
    });
    
    //ページの終了時に実行。ネットワーク状態の監視を終了
    return cleanup;
  }, []);

// Service Worker とネットワーク監視の初期化
  useEffect(() => {
    // Service Worker の初期化
    initializeServiceWorker().then((success) => {
      //Service Workerの準備状態を更新
      setServiceWorkerReady(success);
      //Service Workerの準備状態がtrueの場合はログを出力
      if (success) {
        console.log('Service Worker 初期化完了');
      }
    });

    // ネットワーク状態の監視
    const cleanup = setupNetworkMonitoring((online) => {
      //ネットワーク状態を更新
      setIsOnline(online);
      
      //オンラインになったときの処理
      if (online) {
        // オンラインになったときの処理
        processPostsWhenOnline(setNotification);
        
        // Service Worker でのバックグラウンド同期もトリガー（遅延実行）
        if (serviceWorkerReady) {
          setTimeout(() => {
            //バックグラウンド同期の関数
            triggerBackgroundSync();
          }, 1000); // 1秒待ってから実行
        }
      }
    });
    //ネットワーク状態の監視を終了
    return cleanup;
    //serviceWorkerReadyが変化した時に実行
  }, [serviceWorkerReady]);

  // 通知を閉じる
  const closeNotification = () => {
    setNotification(null);
  };

  return (
    <div className="App">
      <div className="max-w-md mx-auto bg-white h-screen flex flex-col">
        {/* ネットワーク状態表示 */}
        <div className={`text-center py-1 text-white text-sm ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}>
          {isOnline ? 'オンライン' : 'オフライン'}
        </div>
        
        {/* コンテンツ */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'create' ? (
            //OfflinePostSchedulerコンポーネントを呼び出し、isOnlineとsetNotificationを渡す。
            <OfflinePostScheduler 
              isOnline={isOnline} 
              setNotification={setNotification} 
            />
          ) : (
            //SavedPostsコンポーネントを呼び出し、isOnlineとsetNotificationを渡す。
            <SavedPosts 
              isOnline={isOnline} 
              setNotification={setNotification} 
            />
          )}
        </div>
        
        {/* タブナビゲーション */}
        <div className="flex border-t border-gray-200">
          <button
            className={`flex-1 py-3 text-sm ${activeTab === 'create' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
            //setActiveTabはタブの状態を更新する関数。'create'は新規投稿のタブ。
            onClick={() => setActiveTab('create')}
          >
            新規投稿
          </button>
          <button
            className={`flex-1 py-3 text-sm ${activeTab === 'saved' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
            //setActiveTabはタブの状態を更新する関数。'saved'は保存済みのタブ。
            onClick={() => setActiveTab('saved')}
          >
            保存済み
          </button>
        </div>
      </div>
      
      {/* 通知 */}
      {/* Notificationコンポーネントを呼び出し、notificationとonCloseを渡す。 */}
      <Notification 
        notification={notification} 
        onClose={closeNotification} 
      />
    </div>
  );
}
//Appコンポーネントをexport(他のファイルから呼び出せるようにする)
export default App;