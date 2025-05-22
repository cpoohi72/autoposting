import React, { useState } from 'react';
import OfflinePostScheduler from './components/OfflinePostScheduler';
import SavedPosts from './components/SavedPosts';

function App() {
  const [activeTab, setActiveTab] = useState('create');

  return (
    <div className="App">
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        {/* コンテンツ */}
        <div className="flex-1">
          {activeTab === 'create' ? <OfflinePostScheduler /> : <SavedPosts />}
        </div>
        
        {/* タブナビゲーション */}
        <div className="flex border-t border-gray-200">
          <button
            className={`flex-1 py-4 ${activeTab === 'create' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
            onClick={() => setActiveTab('create')}
          >
            新規投稿
          </button>
          <button
            className={`flex-1 py-4 ${activeTab === 'saved' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
            onClick={() => setActiveTab('saved')}
          >
            保存済み
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;