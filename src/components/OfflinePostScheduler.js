"use client"

import { useState } from "react"
import { savePost } from "../utils/indexedDB"
import toast, { Toaster } from "react-hot-toast"

const OfflinePostScheduler = ({ isOnline, setNotification }) => {
  const [saveError, setSaveError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [caption, setCaption] = useState("")
  const [scheduledDateTime, setScheduledDateTime] = useState("")
  const [postingOption, setPostingOption] = useState("whenConnected")
  const now = new Date()
  const [showLimitations, setShowLimitations] = useState(false)

  // 現在の日時をYYYY-MM-DDThh:mm形式で取得（入力の最小値として使用）
  const minDateTime = new Date(now.getTime() + 15 * 60 * 1000).toISOString().slice(0, 16) // 15分後
  const maxDateTime = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // 75日後

  // キャプションの文字数を計算する関数（ハッシュタグカウントを削除）
  const calculateCaptionStats = (text) => {
    const charCount = text.length
    const isCharLimitExceeded = charCount > 2200
    return {
      charCount,
      isCharLimitExceeded,
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
      toast.error("📷 画像を選択してください", {
        duration: 3000,
        position: "top-center",
      })
      setNotification({
        type: "error",
        message: "画像を選択してください",
      })
      return
    }

    // キャプションの制限チェック
    if (captionStats.isCharLimitExceeded) {
      toast.error("📝 キャプションが2,200文字を超えています", {
        duration: 3000,
        position: "top-center",
      })
      setNotification({
        type: "error",
        message: "キャプションが2,200文字を超えています",
      })
      return
    }

    // 日時指定が選択されているが日時が設定されていない場合
    if (postingOption === "specificTime" && !scheduledDateTime) {
      toast.error("⏰ 投稿日時を指定してください", {
        duration: 3000,
        position: "top-center",
      })
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

          // トースト通知で投稿完了を知らせる
          toast.success("🎉 投稿が完了しました！", {
            duration: 4000,
            position: "top-center",
            style: {
              background: "#10B981",
              color: "#fff",
              fontWeight: "bold",
            },
          })

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
          toast.error("❌ 投稿に失敗しました", {
            duration: 4000,
            position: "top-center",
          })
        }
      }

      // IndexedDBに保存
      const postId = await savePost(postData)

      // 保存後の処理
      let message = ""
      if (postingOption === "specificTime") {
        const date = new Date(scheduledDateTime)
        message = `投稿が予約されました（${date.toLocaleString("ja-JP")}）`
        toast.success("📅 予約投稿が設定されました！", {
          duration: 4000,
          position: "top-center",
        })
      } else if (postingOption === "whenConnected") {
        message = isOnline
          ? "投稿が保存されました"
          : "オフラインのため投稿を保存しました。オンライン時に自動投稿されます"
        toast.success("💾 投稿が保存されました", {
          duration: 4000,
          position: "top-center",
        })
      } else {
        message = "下書きが保存されました"
        toast.success("📝 下書きが保存されました", {
          duration: 4000,
          position: "top-center",
        })
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

      toast.error("❌ 投稿の処理に失敗しました", {
        duration: 4000,
        position: "top-center",
      })

      setNotification({
        type: "error",
        message: "投稿の処理に失敗しました。もう一度お試しください。",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col pb-20">
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h1 className="text-lg font-bold">オフライン予約投稿</h1>
        <div className="w-5 h-5">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect x="2" y="2" width="20" height="20" rx="6" stroke="#C13584" strokeWidth="2" />
            <circle cx="12" cy="12" r="5" stroke="#C13584" strokeWidth="2" />
            <circle cx="18.5" cy="5.5" r="1.5" fill="#C13584" />
          </svg>
        </div>
      </div>

      {/* スクロール可能なコンテンツエリア */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 pb-6">
          {/* 画像アップロードエリア */}
          <label
            htmlFor="image-upload"
            className="border border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center justify-center p-4 h-28 cursor-pointer"
          >
            {selectedImage ? (
              <img
                src={selectedImage || "/placeholder.svg"}
                alt="選択された画像"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <>
                <div className="w-10 h-10 mb-1 text-gray-300">
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
                <p className="text-blue-700 text-xs font-medium">写真を選択</p>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
          </label>

          {/* キャプション入力 */}
          <div>
            <textarea
              placeholder="キャプションを入力... (ハッシュタグも含めて)"
              value={caption}
              onChange={handleCaptionChange}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-14"
              maxLength={2200}
            />
            {/* キャプション制限情報 */}
            <div className="flex justify-between text-xs mt-1">
              <div className="text-gray-500">
                <span className={captionStats.isCharLimitExceeded ? "text-red-500" : ""}>
                  {captionStats.charCount}/2,200文字
                </span>
              </div>
            </div>
          </div>

          {/* Instagram制限事項の表示（アコーディオン化） */}
          <div className="border border-gray-200 rounded-lg">
            <button
              type="button"
              className="w-full p-3 text-left flex items-center justify-between bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setShowLimitations(!showLimitations)}
            >
              <span className="text-sm font-medium text-gray-700">📝 Instagram投稿の制限事項</span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${showLimitations ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showLimitations && (
              <div className="p-3 border-t border-gray-200 bg-blue-50">
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>
                    • <strong>キャプション:</strong> 最大2,200文字
                  </li>
                  <li>
                    • <strong>ハッシュタグ:</strong> 最大30個（推奨は5-10個）
                  </li>
                  <li>
                    • <strong>予約投稿:</strong> 15分以上先〜75日以内
                  </li>
                  <li>
                    • <strong>画像形式:</strong> JPG、PNG対応
                  </li>
                  <li>
                    • <strong>画像サイズ:</strong> 最大30MB
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* 投稿時刻オプション */}
          <div>
            <h2 className="text-base font-bold mb-3">投稿時刻</h2>

            <div className="space-y-3">
              <div className="flex items-center">
                <div
                  className={`w-4 h-4 rounded-full border-2 border-gray-400 mr-3 flex items-center justify-center cursor-pointer ${postingOption === "specificTime" ? "border-blue-700" : ""}`}
                  onClick={() => setPostingOption("specificTime")}
                >
                  {postingOption === "specificTime" && <div className="w-2 h-2 rounded-full bg-blue-700"></div>}
                </div>
                <label className="text-sm cursor-pointer" onClick={() => setPostingOption("specificTime")}>
                  日時を指定
                </label>
              </div>

              {/* 日時を指定が選択された場合に表示 */}
              {postingOption === "specificTime" && (
                <div className="ml-7">
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

              <div className="flex items-center">
                <div
                  className={`w-4 h-4 rounded-full border-2 border-gray-400 mr-3 flex items-center justify-center cursor-pointer ${postingOption === "whenConnected" ? "border-blue-700" : ""}`}
                  onClick={() => setPostingOption("whenConnected")}
                >
                  {postingOption === "whenConnected" && <div className="w-2 h-2 rounded-full bg-blue-700"></div>}
                </div>
                <label className="text-sm cursor-pointer" onClick={() => setPostingOption("whenConnected")}>
                  インターネット接続時に投稿
                </label>
              </div>
            </div>
          </div>

          {/* エラーメッセージ */}
          {saveError && <div className="text-red-500 text-sm">{saveError}</div>}
        </div>
      </div>

      {/* 固定ボタンエリア */}
      <div className="border-t border-gray-200 px-4 pt-4 pb-12 bg-white flex-shrink-0">
        <button
          className="w-full bg-[#f47458] text-white rounded-lg py-3 text-base font-medium disabled:opacity-50"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "処理中..." : getButtonText()}
        </button>

        {/* 状況説明テキスト */}
        <p className="text-xs text-gray-500 text-center mt-2">{getStatusText()}</p>
      </div>
      {/* Toasterコンポーネントを追加 */}
      <Toaster />
    </div>
  )
}

export default OfflinePostScheduler
