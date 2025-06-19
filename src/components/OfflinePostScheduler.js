"use client"

import { useState, useEffect } from "react"
import { savePost } from "../utils/indexedDB"
import {postToInstagram} from "../utils/instagramGraphAPI"

const OfflinePostScheduler = ({ isOnline = true, setNotification = () => {} }) => {
  const [saveError, setSaveError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [image_url, setImage_url] = useState(null)
  const [caption, setCaption] = useState("")
  const [post_date, setPost_date] = useState(null)
  const [network_flag, setNetwork_flag] = useState(1) // 1:接続時に投稿、0:日時指定
  const [post_status, setPost_status] = useState("PENDING") // 投稿ステータス
  const [delete_flag] = useState(0) // 削除フラグ
  const [created_at] = useState(new Date().toISOString()) // 作成日時
  const [updated_at] = useState(null) // 更新日時
  const [deleted_at] = useState(null) // 削除日時
  const [viewportHeight, setViewportHeight] = useState(0)
  const [showLimitations, setShowLimitations] = useState(false)

  const now = new Date()

  // iPhone用のビューポート高さを取得
  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight)
    }

    updateViewportHeight()
    window.addEventListener("resize", updateViewportHeight)
    window.addEventListener("orientationchange", updateViewportHeight)

    return () => {
      window.removeEventListener("resize", updateViewportHeight)
      window.removeEventListener("orientationchange", updateViewportHeight)
    }
  }, [])

  // 現在の日時をYYYY-MM-DDThh:mm形式で取得（入力の最小値として使用）
  const minDateTime = new Date(now.getTime() + 15 * 60 * 1000).toISOString().slice(0, 16) // 15分後
  const maxDateTime = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // 75日後

  // キャプションの文字数を計算する関数
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
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload= (e) => {
        setImage_url(e.target.result)
      }   
      reader.readAsDataURL(file)
    }
  }

  // ボタンのテキストを決定する関数
  const getButtonText = () => {
    if (network_flag === 0) {
      return "予約投稿"
    } else if (network_flag === 1) {
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
    if (network_flag === 0 && post_date) {
      const date = new Date(post_date)
      return `${date.toLocaleString("ja-JP")}に投稿予定`
    } else if (network_flag === 1) {
      if (isOnline) {
        return "すぐに投稿されます"
      } else {
        return "オンライン時に自動投稿されます"
      }
    }
    return "※日時を指定してください"
  }

  // 保存/投稿ハンドラー
  const handleSave = async () => {
    try {
      setIsSaving(true)
      setSaveError(null)

      // バリデーション
      if (!image_url) {
        setNotification({
          type: "error",
          message: "画像を選択してください",
        })
        return
      }

      // 画像データの詳細チェック
      if (!image_url.startsWith("data:image/")) {
        console.error("無効な画像データ形式:", image_url.substring(0, 50))
        setNotification({
          type: "error",
          message: "無効な画像データです",
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

      // 日時指定が選択されているが日時が設定されていない場合
      if (network_flag === 0 && !post_date) {
        setNotification({
          type: "error",
          message: "投稿日時を指定してください",
        })
        return
      }

      // 日時指定の制限チェック
      if (network_flag === 0 && post_date) {
        const selectedTime = new Date(post_date)
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

      // 投稿データを作成
      const postData = {
        image_url, // Base64画像データ
        caption,
        post_date: network_flag === 0 ? post_date : null,
        network_flag,
        post_status,
        delete_flag,
        created_at,
        updated_at,
        deleted_at,
      }

      // 即座に投稿する場合（オンライン + インターネット接続時に投稿）
      if (isOnline && network_flag === 1) {
        try {
          // 実際の投稿処理をシミュレート
          const response = await postToInstagram(image_url, caption)
          if (!response || !response.success) {
            throw new Error(response.error || "投稿に失敗しました")
          }else{
            setNotification({
              type: "success",
              message: "投稿が完了しました！",
            })
          }

          // フォームをリセット
          setImage_url(null)
          setCaption("")
          setPost_date("")
          setCaptionStats(calculateCaptionStats(""))
          return
        } catch (error) {
          console.error("投稿中にエラーが発生しました:", error)
          // エラーの場合は保存して後で投稿
          setPost_status("FAILED")
          setNotification({
            type: "error",
            message: "投稿に失敗しました",
          })
        }
      }

      // IndexedDBに保存
      const postId = await savePost(postData)

      // 保存後の検証
      if (postId) {

        // 保存後の処理
        let message = ""
        if (network_flag === 0) {
          setNotification({
            type: "success",
            message: "予約投稿が設定されました！",
          })
        } else if (network_flag === 1) {
          message = isOnline
            ? "投稿が保存されました"
            : "オフラインのため投稿を保存しました。オンライン時に自動投稿されます"
          setNotification({
            type: "success",
            message: message,
          })

          // フォームをリセット
          setImage_url(null)
          setCaption("")
          setPost_date(null)
          setCaptionStats(calculateCaptionStats(""))
        } else {
          throw new Error("保存IDが取得できませんでした")
        }
      } catch (error) {
      console.error("投稿の保存中にエラーが発生しました:", error)
      setSaveError("投稿の処理に失敗しました。もう一度お試しください。")

      setNotification({
        type: "error",
        message: "投稿の処理に失敗しました",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const headerHeight = 60
  const footerHeight = 180

  return (
    <div className="w-full max-w-md mx-auto bg-white relative" style={{ height: viewportHeight || "100vh" }}>
      {/* ヘッダー - 固定 */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-white"
        style={{ height: headerHeight }}
      >
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
      <div
        className="absolute left-0 right-0 overflow-y-auto"
        style={{
          top: headerHeight,
          bottom: footerHeight,
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
      >
        <div className="p-4 space-y-4">
          {/* 画像アップロードエリア */}
          <label
            htmlFor="image-upload"
            className="border border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center justify-center p-4 cursor-pointer"
            style={{ minHeight: image_url ? "auto" : "112px" }}
          >
            {image_url ? (
              <div className="w-full">
                <img
                  src={image_url || "/placeholder.svg"}
                  alt="選択された画像"
                  className="w-full h-auto object-contain rounded-lg"
                  style={{
                    minHeight: "200px",
                    maxHeight: "400px",
                  }}
                />
                <p className="text-blue-700 text-xs font-medium text-center mt-3 py-2 px-4 bg-blue-50 rounded-lg">
                  タップして画像を変更
                </p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 mb-2 text-gray-300">
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
                <p className="text-gray-500 text-xs mt-1">JPG、PNG対応（最大30MB）</p>
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
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-32"
              maxLength={2200}
              style={{ WebkitAppearance: "none" }}
            />
            <div className="flex justify-between text-xs mt-1">
              <div className="text-gray-500">
                <span className={captionStats.isCharLimitExceeded ? "text-red-500" : ""}>
                  {captionStats.charCount}/2,200文字
                </span>
              </div>
            </div>
          </div>

          {/* Instagram制限事項の表示 */}
          <div className="border border-gray-200 rounded-lg">
            <button
              type="button"
              className="w-full p-3 text-left flex items-center justify-between bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setShowLimitations(!showLimitations)}
            >
              <span className="text-sm font-medium text-gray-700">Instagram投稿の制限事項</span>
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
                  className={`w-4 h-4 rounded-full border-2 border-gray-400 mr-3 flex items-center justify-center cursor-pointer ${network_flag === 0 ? "border-blue-700" : ""}`}
                  onClick={() => setNetwork_flag(0)}
                >
                  {network_flag === 0 && <div className="w-2 h-2 rounded-full bg-blue-700"></div>}
                </div>
                <label className="text-sm cursor-pointer" onClick={() => setNetwork_flag(0)}>
                  日時を指定
                </label>
              </div>

              {network_flag === 0 && (
                <div className="ml-7">
                  <input
                    type="datetime-local"
                    value={post_date}
                    onChange={(e) => setPost_date(e.target.value)}
                    min={minDateTime}
                    max={maxDateTime}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                    style={{ WebkitAppearance: "none" }}
                  />
                  <p className="text-xs text-gray-500 mt-1">※ 15分以上先〜75日以内で設定してください</p>
                </div>
              )}

              <div className="flex items-center">
                <div
                  className={`w-4 h-4 rounded-full border-2 border-gray-400 mr-3 flex items-center justify-center cursor-pointer ${network_flag === 1 ? "border-blue-700" : ""}`}
                  onClick={() => setNetwork_flag(1)}
                >
                  {network_flag === 1 && <div className="w-2 h-2 rounded-full bg-blue-700"></div>}
                </div>
                <label className="text-sm cursor-pointer" onClick={() => setNetwork_flag(1)}>
                  インターネット接続時に投稿
                </label>
              </div>
            </div>
          </div>

          {/* エラーメッセージ */}
          {saveError && <div className="text-red-500 text-sm">{saveError}</div>}

          <div className="h-20"></div>
        </div>
      </div>

      {/* 固定ボタンエリア */}
      <div
        className="absolute bottom-0 left-0 right-0 border-t border-gray-200 px-4 pt-4 pb-16 bg-white shadow-lg"
        style={{ height: footerHeight }}
      >
        <button
          className="w-full bg-[#f47458] text-white rounded-lg py-3 text-base font-medium disabled:opacity-50"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "処理中..." : getButtonText()}
        </button>

        <p className="text-xs text-gray-500 text-center mt-3">{getStatusText()}</p>

        <div className="flex justify-center space-x-8 mt-4 pb-4">
          <button className="text-xs text-blue-600 font-medium">新規投稿</button>
          <button className="text-xs text-gray-500">保存済み</button>
        </div>
      </div>
    </div>
  )
}

export default OfflinePostScheduler
