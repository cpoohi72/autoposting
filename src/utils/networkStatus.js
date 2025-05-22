// ネットワーク状態を監視する
export const setupNetworkMonitoring = (callback) => {
    const handleOnline = () => {
      console.log('オンラインになりました');
      callback(true);
    };
  
    const handleOffline = () => {
      console.log('オフラインになりました');
      callback(false);
    };
  
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  
    // 初期状態を返す
    callback(navigator.onLine);
  
    // クリーンアップ関数を返す
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  };