import React, { useState, useEffect } from 'react';
import OfflinePostScheduler from './components/OfflinePostScheduler';
import SavedPosts from './components/SavedPosts';
import Notification from './components/Notification';
import { setupNetworkMonitoring, processPostsWhenOnline } from './utils/networkStatus';
import { initializeServiceWorker, triggerBackgroundSync } from './utils/serviceWorker';

function App() {
  const [activeTab, setActiveTab] = useState('create');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notification, setNotification] = useState(null);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  // ネットワーク状態の監視
  useEffect(() => {
    const cleanup = setupNetworkMonitoring((online) => {
      setIsOnline(online);
      
      // オンラインになったときに投稿を処理
      if (online) {
        processPostsWhenOnline(setNotification);
      }
    });
    
    return cleanup;
  }, []);

// Service Worker とネットワーク監視の初期化
  useEffect(() => {
    // Service Worker の初期化
    initializeServiceWorker().then((success) => {
      setServiceWorkerReady(success);
      if (success) {
        console.log('Service Worker 初期化完了');
      }
    });

    // ネットワーク状態の監視
    const cleanup = setupNetworkMonitoring((online) => {
      setIsOnline(online);
      
      if (online) {
        // オンラインになったときの処理
        processPostsWhenOnline(setNotification);
        
        // Service Worker でのバックグラウンド同期もトリガー
        if (serviceWorkerReady) {
          triggerBackgroundSync();
        }
      }
    });
    
    return cleanup;
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
            <OfflinePostScheduler 
              isOnline={isOnline} 
              setNotification={setNotification} 
            />
          ) : (
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
            onClick={() => setActiveTab('create')}
          >
            新規投稿
          </button>
          <button
            className={`flex-1 py-3 text-sm ${activeTab === 'saved' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
            onClick={() => setActiveTab('saved')}
          >
            保存済み
          </button>
        </div>
      </div>
      
      {/* 通知 */}
      <Notification 
        notification={notification} 
        onClose={closeNotification} 
      />
    </div>
  );
}

export default App;