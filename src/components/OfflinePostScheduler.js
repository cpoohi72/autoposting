import React, { useState } from 'react';
import { savePost } from '../utils/indexedDB';

function OfflinePostScheduler({ isOnline, setNotification }) {
  // 既存の状態
  const [selectedImage, setSelectedImage] = useState(null);
  const [caption, setCaption] = useState("");
  const [postingOption, setPostingOption] = useState("whenConnected");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

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
  const handleSave = async () => {
    // バリデーション
    if (!selectedImage) {
      setNotification({
        type: 'error',
        message: '画像を選択してください'
      });
      return;
    }

    // 日時指定が選択されているが日時が設定されていない場合
    if (postingOption === "specificTime" && !scheduledDateTime) {
      setNotification({
        type: 'error',
        message: '投稿日時を指定してください'
      });
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      // 投稿データを作成
      const postData = {
        image: selectedImage,
        caption,
        postingOption,
        scheduledDateTime: postingOption === "specificTime" ? scheduledDateTime : null,
      };
      
      // IndexedDBに保存
      const postId = await savePost(postData);
      
      // 保存後の処理
      setNotification({
        type: 'success',
        message: '投稿が保存されました'
      });
      
      // フォームをリセット
      setSelectedImage(null);
      setCaption('');
      setScheduledDateTime('');
    } catch (error) {
      console.error('投稿の保存中にエラーが発生しました:', error);
      setSaveError('投稿の保存に失敗しました。もう一度お試しください。');
      setNotification({
        type: 'error',
        message: '投稿の保存に失敗しました。もう一度お試しください。'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white h-screen flex flex-col">
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-4 py-4">
        <h1 className="text-xl font-bold">オフライン予約投稿</h1>
        <div className="w-6 h-6">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect x="2" y="2" width="20" height="20" rx="6" stroke="#C13584" strokeWidth="2" />
            <circle cx="12" cy="12" r="5" stroke="#C13584" strokeWidth="2" />
            <circle cx="18.5" cy="5.5" r="1.5" fill="#C13584" />
          </svg>
        </div>
      </div>

      {/* 画像アップロードエリア */}
      <label htmlFor="image-upload" className="mx-4 my-2 border border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center justify-center p-4 h-40 cursor-pointer">
        {selectedImage ? (
          <img
            src={selectedImage || "/placeholder.svg"}
            alt="選択された画像"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <>
            <div className="w-16 h-16 mb-2 text-gray-300">
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
            <p className="text-blue-700 text-sm font-medium">写真を選択</p>
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
      <div className="mx-4 my-2">
        <input
          type="text"
          placeholder="キャプションを入力..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full border border-gray-200 rounded-lg p-3 text-base"
        />
      </div>

      {/* 投稿時刻オプション */}
      <div className="mx-4 my-2 flex-1">
        <h2 className="text-lg font-bold mb-2">投稿時刻</h2>

        <div className="flex items-center mb-2">
          <div
            className={`w-5 h-5 rounded-full border-2 border-gray-400 mr-2 flex items-center justify-center ${postingOption === "specificTime" ? "border-blue-700" : ""}`}
            onClick={() => setPostingOption("specificTime")}
          >
            {postingOption === "specificTime" && <div className="w-2.5 h-2.5 rounded-full bg-blue-700"></div>}
          </div>
          <label className="text-base">日時を指定</label>
        </div>

        {/* 日時を指定が選択された場合に表示 */}
        {postingOption === "specificTime" && (
          <div className="ml-7 mb-2">
            <input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              min={minDateTime}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
            />
          </div>
        )}

        <div className="flex items-center mb-2">
          <div
            className={`w-5 h-5 rounded-full border-2 border-gray-400 mr-2 flex items-center justify-center ${postingOption === "whenConnected" ? "border-blue-700" : ""}`}
            onClick={() => setPostingOption("whenConnected")}
          >
            {postingOption === "whenConnected" && <div className="w-2.5 h-2.5 rounded-full bg-blue-700"></div>}
          </div>
          <label className="text-base">インターネット接続時に投稿</label>
        </div>
      </div>

      {/* エラーメッセージ */}
      {saveError && (
        <div className="mx-4 my-1 text-red-500 text-sm">
          {saveError}
        </div>
      )}

      {/* 保存ボタン */}
      <div className="mx-4 my-3">
        <button 
          className="w-full bg-[#f47458] text-white rounded-lg py-3 text-lg font-medium disabled:opacity-50"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* ホームインジケーター */}
      <div className="h-1 w-24 bg-black rounded-full mx-auto mb-1"></div>
    </div>
  );
}

export default OfflinePostScheduler;