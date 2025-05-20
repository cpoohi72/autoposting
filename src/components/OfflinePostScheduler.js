import React, { useState } from 'react';

function OfflinePostScheduler() {
  // 既存の状態
  const [selectedImage, setSelectedImage] = useState(null);
  const [caption, setCaption] = useState("");
  const [postingOption, setPostingOption] = useState("whenConnected");
  
  // 日時選択用の状態を追加
  const [scheduledDateTime, setScheduledDateTime] = useState("");

  // 現在の日時をYYYY-MM-DDThh:mm形式で取得（入力の最小値として使用）
  const now = new Date();
  const minDateTime = now.toISOString().slice(0, 16);

  // 画像選択ハンドラー
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 保存ハンドラー
  const handleSave = () => {
    // バリデーション
    if (!selectedImage) {
      alert("画像を選択してください");
      return;
    }

    // 日時指定が選択されているが日時が設定されていない場合
    if (postingOption === "specificTime" && !scheduledDateTime) {
      alert("投稿日時を指定してください");
      return;
    }

    // 投稿データを作成
    const postData = {
      id: Date.now(),
      image: selectedImage,
      caption,
      postingOption,
      scheduledDateTime: postingOption === "specificTime" ? scheduledDateTime : null,
      createdAt: new Date().toISOString(),
    };
    
    // ローカルストレージから既存の投稿を取得
    const savedPosts = JSON.parse(localStorage.getItem('offlinePosts') || '[]');
    
    // 新しい投稿を追加
    savedPosts.push(postData);
    
    // ローカルストレージに保存
    localStorage.setItem('offlinePosts', JSON.stringify(savedPosts));
    
    // 保存後の処理
    alert('投稿が保存されました');
    
    // フォームをリセット
    setSelectedImage(null);
    setCaption('');
    setScheduledDateTime('');
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-6 py-4">
        <h1 className="text-3xl font-bold">オフライン予約投稿</h1>
        <div className="w-8 h-8">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect x="2" y="2" width="20" height="20" rx="6" stroke="#C13584" strokeWidth="2" />
            <circle cx="12" cy="12" r="5" stroke="#C13584" strokeWidth="2" />
            <circle cx="18.5" cy="5.5" r="1.5" fill="#C13584" />
          </svg>
        </div>
      </div>

      {/* 画像アップロードエリア */}
      <label htmlFor="image-upload" className="mx-6 my-4 border border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center justify-center p-8 h-72 cursor-pointer">
        {selectedImage ? (
          <img
            src={selectedImage || "/placeholder.svg"}
            alt="選択された画像"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <>
            <div className="w-32 h-32 mb-4 text-gray-300">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path
                  d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M8.5 8.5C8.5 9.32843 7.82843 10 7 10C6.17157 10 5.5 9.32843 5.5 8.5C5.5 7.67157 6.17157 7 7 7C7.82843 7 8.5 7.67157 8.5 8.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M19 14L16 11L9 18" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <p className="text-blue-700 text-lg font-medium">写真を選択</p>
          </>
        )}
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageChange} 
          className="hidden" 
          id="image-upload" 
        />
      </label>

      {/* キャプション入力 */}
      <div className="mx-6 my-4">
        <input
          type="text"
          placeholder="キャプションを入力..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full border border-gray-200 rounded-lg p-4 text-lg"
        />
      </div>

      {/* 投稿時刻オプション */}
      <div className="mx-6 my-4">
        <h2 className="text-2xl font-bold mb-4">投稿時刻</h2>

        <div className="flex items-center mb-4">
          <div
            className={`w-6 h-6 rounded-full border-2 border-gray-400 mr-3 flex items-center justify-center ${postingOption === "specificTime" ? "border-blue-700" : ""}`}
            onClick={() => setPostingOption("specificTime")}
          >
            {postingOption === "specificTime" && <div className="w-3 h-3 rounded-full bg-blue-700"></div>}
          </div>
          <label className="text-xl">日時を指定</label>
        </div>

        {/* 日時を指定が選択された場合に表示 */}
        {postingOption === "specificTime" && (
          <div className="ml-9 mb-4">
            <input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              min={minDateTime}
              className="w-full border border-gray-200 rounded-lg p-2 text-lg"
            />
          </div>
        )}

        <div className="flex items-center mb-4">
          <div
            className={`w-6 h-6 rounded-full border-2 border-gray-400 mr-3 flex items-center justify-center ${postingOption === "whenConnected" ? "border-blue-700" : ""}`}
            onClick={() => setPostingOption("whenConnected")}
          >
            {postingOption === "whenConnected" && <div className="w-3 h-3 rounded-full bg-blue-700"></div>}
          </div>
          <label className="text-xl">インターネット接続時に投稿</label>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="mx-6 my-4 mt-auto mb-8">
        <button 
          className="w-full bg-[#f47458] text-white rounded-lg py-4 text-xl font-medium"
          onClick={handleSave}
        >
          保存
        </button>
      </div>
      </div>
  );
}

export default OfflinePostScheduler;