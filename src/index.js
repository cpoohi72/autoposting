import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Workerの登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker 登録成功:', registration.scope);
        
        // 更新があるかチェック
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新しいバージョンが利用可能
              console.log('新しいバージョンが利用可能です');
              // ユーザーに更新を促すUI表示
              showUpdateAvailableNotification();
            }
          });
        });
      })
      .catch((error) => {
        console.log('Service Worker 登録失敗:', error);
      });
  });
}

function showUpdateAvailableNotification() {
  // 更新通知のUI表示
  if (window.confirm('新しいバージョンが利用可能です。更新しますか？')) {
    window.location.reload();
  }
}


// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
