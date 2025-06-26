//必要ライブラリのインポート
import React from 'react';
import ReactDOM from 'react-dom/client';

//CSSのインポート
import './index.css';

//Appコンポーネントのインポート
import App from './App';

//Web Vitalsのインポート(アプリのパフォーマンスを測定するためのライブラリ)
import reportWebVitals from './reportWebVitals';

//ReactDOMのルート要素の作成(Reactのルート要素を取得。今回はdiv)
const root = ReactDOM.createRoot(document.getElementById('root'));

//Appコンポーネントのレンダリング
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Workerの登録
if ('serviceWorker' in navigator) {
  //ページのロード時にService Workerを登録
  window.addEventListener('load', () => {
    //Service Worker(sw.js)を登録
    navigator.serviceWorker.register('/sw.js')
      //thenは登録成功時に行われる処理(sw.js)
      //registrationはService Workerの登録情報。navigator.serviceWorker.register('/sw.js')の戻り値
      .then((registration) => {
        console.log('Service Worker 登録成功:', registration.scope);
        
        // 更新があるかチェック
        registration.addEventListener('updatefound', () => {
          //新しいバージョンのService Workerを取得
          const newWorker = registration.installing;
          //newWorker.statechangeはService Workerの状態が変化した時に行われる処理
          newWorker.addEventListener('statechange', () => {
            //newWorker.stateはService Workerの状態。'installed'は新しいバージョンがインストールされた状態
            //navigator.serviceWorker.controllerはService Workerのコントローラー。コントローラーがある場合は新しいバージョンが利用可能
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
//更新通知のUI表示
function showUpdateAvailableNotification() {
  if (window.confirm('新しいバージョンが利用可能です。更新しますか？')) {
    // 更新を確認するとページをリロード
    window.location.reload();
  }
}

// Web Vitalsのパフォーマンスを測定するための関数
reportWebVitals();
