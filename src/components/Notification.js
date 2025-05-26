import React, { useEffect } from 'react';

function Notification({ notification, onClose }) {
  useEffect(() => {
    if (notification) {
      // 5秒後に自動的に通知を閉じる
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);
  
  if (!notification) return null;
  
  // 通知タイプに基づいて背景色を設定
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  }[notification.type] || 'bg-gray-500';
  
  return (
    <div className={`fixed bottom-4 right-4 max-w-md p-4 rounded-lg shadow-lg text-white ${bgColor} transition-all duration-300 ease-in-out z-50`}>
      <div className="flex justify-between items-start">
        <p className="text-sm">{notification.message}</p>
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