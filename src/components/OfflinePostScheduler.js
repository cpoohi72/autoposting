"use client"

import { useState } from "react"
import { savePost } from "../utils/indexedDB"

const OfflinePostScheduler = ({ isOnline, setNotification }) => {
  const [saveError, setSaveError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [caption, setCaption] = useState("")
  const [scheduledDateTime, setScheduledDateTime] = useState("")
  const [postingOption, setPostingOption] = useState("whenConnected")
  const now = new Date()

  // 現在の日時をYYYY-MM-DDThh:mm形式で取得（入力の最小値として使用）
  const minDateTime = new Date(now.getTime() + 15 * 60 * 1000).toISOString().slice(0, 16) // 15分後
  const maxDateTime = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // 75日後

  // キャプションの文字数とハッシュタグの数を計算する関数
  const calculateCaptionStats = (text) => {
    const charCount = text.length
    const hashtagCount = (text.match(/#/g) || []).length
    const isCharLimitExceeded = charCount > 2200
    const isHashtagLimitExceeded = hashtagCount > 30
    return {
      charCount,
      hashtagCount,
      isCharLimitExceeded,
      isHashtagLimitExceeded,
    }
  }

  const [captionStats, setCaptionStats] = useState(calculateCaptionStats(""))

  // キャプションが変更されたときに統計を更新
  const handleCaptionChange = (e) => {
    const newCaption = e.target.value
    setCaption(newCaption)
    setCaptionStats(calculateCaptionStats(newCaption))
  }

  // 画像選択ハンドラー
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // ボタンのテキストを決定する関数
  const getButtonText = () => {
    if (postingOption === "specificTime") {
      return "予約投稿"
    } else if (postingOption === "whenConnected") {
      if (isOnline) {
        return "投稿する"
      } else {
        return "オフライン投稿"
      }
    }
    return "保存"
  }

  // 状況説明テキストを決定する関数
  const getStatusText = () => {
    if (postingOption === "specificTime" && scheduledDateTime) {
      const date = new Date(scheduledDateTime)
      return `${date.toLocaleString("ja-JP")}に投稿予定`
    } else if (postingOption === "whenConnected") {
      if (isOnline) {
        return "すぐに投稿されます"
      } else {
        return "オンライン時に自動投稿されます"
      }
    }
    return "下書きとして保存されます"
  }

  // 保存/投稿ハンドラー
  const handleSave = async () => {
    // バリデーション
    if (!selectedImage) {
      setNotification({
        type: "error",
        message: "画像を選択してください",
      })
      return
    }

    // キャプションの制限チェック
    if (captionStats.isCharLimitExceeded) {
      setNotification({
        type: "error",
        message: "キャプションが2,200文字を超えています",
      })
      return
    }

    if (captionStats.isHashtagLimitExceeded) {
      setNotification({
        type: "error",
        message: "ハッシュタグが30個を超えています",
      })
      return
    }

    // 日時指定が選択されているが日時が設定されていない場合
    if (postingOption === "specificTime" && !scheduledDateTime) {
      setNotification({
        type: "error",
        message: "投稿日時を指定してください",
      })
      return
    }

    // 日時指定の制限チェック
    if (postingOption === "specificTime" && scheduledDateTime) {
      const selectedTime = new Date(scheduledDateTime)
      const minTime = new Date(now.getTime() + 15 * 60 * 1000)
      const maxTime = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000)

      if (selectedTime < minTime) {
        setNotification({
          type: "error",
          message: "予約時刻は15分以上先に設定してください",
        })
        return
      }

      if (selectedTime > maxTime) {
        setNotification({
          type: "error",
          message: "予約時刻は75日以内に設定してください",
        })
        return
      }
    }

    try {
      setIsSaving(true)
      setSaveError(null)

      // 投稿データを作成
      const postData = {
        image: selectedImage,
        caption,
        postingOption,
        scheduledDateTime: postingOption === "specificTime" ? scheduledDateTime : null,
      }

      // 即座に投稿する場合（オンライン + インターネット接続時に投稿）
      if (isOnline && postingOption === "whenConnected") {
        try {
          // 実際の投稿処理をシミュレート
          await new Promise((resolve) => setTimeout(resolve, 2000))

          setNotification({
            type: "success",
            message: "投稿が完了しました",
          })

          // フォームをリセット
          setSelectedImage(null)
          setCaption("")
          setScheduledDateTime("")
          setCaptionStats(calculateCaptionStats(""))
          return
        } catch (error) {
          console.error("投稿中にエラーが発生しました:", error)
          // エラーの場合は保存して後で投稿
        }
      }

      // IndexedDBに保存
      const postId = await savePost(postData)

      // 保存後の処理
      let message = ""
      if (postingOption === "specificTime") {
        const date = new Date(scheduledDateTime)
        message = `投稿が予約されました（${date.toLocaleString("ja-JP")}）`
      } else if (postingOption === "whenConnected") {
        message = isOnline
          ? "投稿が保存されました"
          : "オフラインのため投稿を保存しました。オンライン時に自動投稿されます"
      } else {
        message = "下書きが保存されました"
      }

      setNotification({
        type: "success",
        message: message,
      })

      // フォームをリセット
      setSelectedImage(null)
      setCaption("")
      setScheduledDateTime("")
      setCaptionStats(calculateCaptionStats(""))
    } catch (error) {
      console.error("投稿の保存中にエラーが発生しました:", error)
      setSaveError("投稿の処理に失敗しました。もう一度お試しください。")
      setNotification({
        type: "error",
        message: "投稿の処理に失敗しました。もう一度お試しください。",
      })
    } finally {
      setIsSaving(false)
    }
  }

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
      <label
        htmlFor="image-upload"
        className="mx-4 my-2 border border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center justify-center p-4 h-40 cursor-pointer"
      >
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
        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
      </label>

      {/* キャプション入力 */}
      <div className="mx-4 my-2">
        <textarea
          placeholder="キャプションを入力... (ハッシュタグも含めて)"
          value={caption}
          onChange={handleCaptionChange}
          className="w-full border border-gray-200 rounded-lg p-3 text-base resize-none h-20"
          maxLength={2200}
        />
        {/* キャプション制限情報 */}
        <div className="flex justify-between text-xs mt-1">
          <div className="text-gray-500">
            <span className={captionStats.isCharLimitExceeded ? "text-red-500" : ""}>
              {captionStats.charCount}/2,200文字
            </span>
            {captionStats.hashtagCount > 0 && (
              <span className={`ml-2 ${captionStats.isHashtagLimitExceeded ? "text-red-500" : ""}`}>
                ハッシュタグ: {captionStats.hashtagCount}/30個
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Instagram制限事項の表示 */}
      <div className="mx-4 my-1 p-2 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-800 font-medium mb-1">📝 Instagram投稿の制限事項</p>
        <ul className="text-xs text-blue-700 space-y-0.5">
          <li>• キャプション: 最大2,200文字</li>
          <li>• ハッシュタグ: 最大30個</li>
          <li>• 予約投稿: 15分以上先〜75日以内</li>
        </ul>
      </div>

      {/* 投稿時刻オプション */}
      <div className="mx-4 my-2">
        <h2 className="text-lg font-bold mb-2">投稿時刻</h2>

        <div className="flex items-center mb-2">
          <div
            className={`w-5 h-5 rounded-full border-2 border-gray-400 mr-2 flex items-center justify-center cursor-pointer ${postingOption === "specificTime" ? "border-blue-700" : ""}`}
            onClick={() => setPostingOption("specificTime")}
          >
            {postingOption === "specificTime" && <div className="w-2.5 h-2.5 rounded-full bg-blue-700"></div>}
          </div>
          <label className="text-base cursor-pointer" onClick={() => setPostingOption("specificTime")}>
            日時を指定
          </label>
        </div>

        {/* 日時を指定が選択された場合に表示 */}
        {postingOption === "specificTime" && (
          <div className="ml-7 mb-3">
            <input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              min={minDateTime}
              max={maxDateTime}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">※ 15分以上先〜75日以内で設定してください</p>
          </div>
        )}

        <div className="flex items-center mb-4">
          <div
            className={`w-5 h-5 rounded-full border-2 border-gray-400 mr-2 flex items-center justify-center cursor-pointer ${postingOption === "whenConnected" ? "border-blue-700" : ""}`}
            onClick={() => setPostingOption("whenConnected")}
          >
            {postingOption === "whenConnected" && <div className="w-2.5 h-2.5 rounded-full bg-blue-700"></div>}
          </div>
          <label className="text-base cursor-pointer" onClick={() => setPostingOption("whenConnected")}>
            インターネット接続時に投稿
          </label>
        </div>
      </div>

      {/* エラーメッセージ */}
      {saveError && <div className="mx-4 mb-2 text-red-500 text-sm">{saveError}</div>}

      {/* 投稿/保存ボタン（1つのボタン） */}
      <div className="mx-4 mt-4 mb-20">
        <button
          className="w-full bg-[#f47458] text-white rounded-lg py-3 text-lg font-medium disabled:opacity-50"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "処理中..." : getButtonText()}
        </button>

        {/* 状況説明テキスト */}
        <p className="text-xs text-gray-500 text-center mt-2">{getStatusText()}</p>
      </div>

      {/* ホームインジケーター */}
      <div className="h-1 w-24 bg-black rounded-full mx-auto mb-4"></div>
    </div>
  )
}

export default OfflinePostScheduler
