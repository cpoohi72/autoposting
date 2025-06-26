//通知を表示するコンポーネント App.jsから呼び出される
//useEffectのインポート
import React, { useEffect } from 'react';

//Notificationコンポーネントの定義
//notificationは通知のデータ
//onCloseは通知を閉じる関数
function Notification({ notification, onClose }) {
  //notificationがある場合(通知が表示されている場合)
  useEffect(() => {
    if (notification) {
      // 5秒後に自動的に通知を閉じる
      const timer = setTimeout(() => {
        //通知を閉じる
        onClose();
      }, 5000);
      //タイムアウトをクリア
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  //notificationがない場合(通知が表示されていない場合)
  //何もしない
  if (!notification) return null;
  
  //通知タイプに基づいて背景色を設定
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  }[notification.type] || 'bg-gray-500';
  
  //通知を表示(HTML部分)
  return (
    <div className={`fixed bottom-4 right-4 max-w-md p-4 rounded-lg shadow-lg text-white ${bgColor} transition-all duration-300 ease-in-out z-50`}>
      {/* 通知の内容を表示 */}
      <div className="flex justify-between items-start">
        {/* 通知の内容を表示 */}
        <p className="text-sm">{notification.message}</p>
        {/* 通知を閉じるボタン */}
        <button 
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200 text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default Notification;