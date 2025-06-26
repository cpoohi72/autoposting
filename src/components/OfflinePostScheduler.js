//オフライン予約投稿を表示するコンポーネント App.jsから呼び出される
"use client"

//useStateとuseEffectのインポート
import { useState, useEffect } from "react"
//indexedDB.jsのsavePost関数をインポート
import { savePost } from "../utils/indexedDB"
//instagramGraphAPI.jsのpostToInstagram関数をインポート
import {postToInstagram} from "../utils/instagramGraphAPI"
//instagramGraphAPI.jsのprocessInstagramPost関数をインポート
import { processInstagramPost } from "../utils/instagramGraphAPI"

//OfflinePostSchedulerコンポーネントの定義
const OfflinePostScheduler = ({ isOnline = true, setNotification = () => {} }) => {
  //エラーがあるかどうかを管理
  const [saveError, setSaveError] = useState(null)
  //保存中かどうかを管理
  const [isSaving, setIsSaving] = useState(false)
  //画像のURLを管理
  const [image_url, setImage_url] = useState(null)
  //キャプションを管理
  const [caption, setCaption] = useState("")
  //投稿日時を管理
  const [post_date, setPost_date] = useState(null)
  //投稿ステータスを管理
  const [network_flag, setNetwork_flag] = useState(1) // 1:接続時に投稿、0:日時指定
  //投稿ステータスを管理
  const [post_status, setPost_status] = useState("PENDING") // 投稿ステータス
  //削除フラグを管理
  const [delete_flag] = useState(0) // 削除フラグ
  //作成日時を管理
  const [created_at] = useState(new Date().toISOString()) // 作成日時
  //更新日時を管理
  const [updated_at] = useState(null) // 更新日時
  //削除日時を管理
  const [deleted_at] = useState(null) // 削除日時
  //ビューポート高さを管理
  const [viewportHeight, setViewportHeight] = useState(0)
  //制限事項を表示するかどうかを管理
  const [showLimitations, setShowLimitations] = useState(false)

  //現在の日時を取得
  const now = new Date()

  // iPhone用のビューポート高さを取得(ビューポート高さを取得する)
  useEffect(() => {
    //ビューポート高さを更新する関数
    const updateViewportHeight = () => {
      //ビューポート高さを更新
      setViewportHeight(window.innerHeight)
    }

    //ビューポート高さを更新
    updateViewportHeight()
    //ビューポート高さを更新する関数を呼び出す
    window.addEventListener("resize", updateViewportHeight)
    //ビューポート高さを更新する関数を呼び出す
    window.addEventListener("orientationchange", updateViewportHeight)

    //ビューポート高さを更新する関数を呼び出す
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
    //文字数を計算
    const charCount = text.length
    //文字数が2200文字を超えているかどうかを管理
    const isCharLimitExceeded = charCount > 2200
    //文字数と文字数が2200文字を超えているかどうかを返す
    return {
      charCount,
      isCharLimitExceeded,
    }
  }

  // キャプションの文字数を管理
  const [captionStats, setCaptionStats] = useState(calculateCaptionStats(""))

  // キャプションが変更されたときに統計を更新
  const handleCaptionChange = (e) => {
    //キャプションを更新
    const newCaption = e.target.value
    //キャプションを更新
    setCaption(newCaption)
    //キャプションの文字数を更新
    setCaptionStats(calculateCaptionStats(newCaption))
  }

  // 画像選択ハンドラー
  const handleImageChange = (e) => {
    //ファイルを取得
    const file = e.target.files?.[0]
    //ファイルがある場合
    if (file) {
      //ファイルを読み込むFileReaderオブジェクトを作成
      const reader = new FileReader()
      //ファイルを読み込む
      reader.onload= (e) => {
        //画像のURLを更新
        setImage_url(e.target.result)
      }
      //ファイルを読み込む(ファイルをDataURL形式に変換する)
      reader.readAsDataURL(file)
    }
  }

  // ボタンのテキストを決定する関数
  const getButtonText = () => {
    //投稿日時がある場合
    if (network_flag === 0) {
      //予約投稿
      return "予約投稿"
    } else if (network_flag === 1) {
      //投稿日時がない場合
      if (isOnline) {
        //投稿する
        return "投稿する"
      } else {
        //オフライン投稿
        return "オフライン投稿"
      }
    }
    //保存
    return "保存"
  }

  // 状況説明テキストを決定する関数
  const getStatusText = () => {
    //投稿日時がある場合
    if (network_flag === 0 && post_date) {
      //投稿日時を取得
      const date = new Date(post_date)
      //投稿日時を表示
      return `${date.toLocaleString("ja-JP")}に投稿予定`
    } else if (network_flag === 1) {
      //投稿日時がない場合
      if (isOnline) {
        //すぐに投稿されます
        return "すぐに投稿されます"
      } else {
        //オンライン時に自動投稿されます
        return "オンライン時に自動投稿されます"
      }
    }
    //日時を指定してください
    return "※日時を指定してください"
  }

// 保存ボタンを押したときの処理
const handleSave = async () => {
    try {
        //保存中にする
        setIsSaving(true);
        //エラーをクリア
        setSaveError(null);

        // 投稿データを作成(投稿データを作成する)
        const postData = {
            image_url: image_url, // Base64画像データ
            caption, // キャプション
            post_date: network_flag === 0 ? post_date : null, // 投稿日時
            network_flag, // ネットワークフラグ
            post_status: "PENDING", // 投稿ステータス
            delete_flag: 0, // 削除フラグ
            created_at: new Date().toISOString(), // 作成日時
            deleted_at: null, // 削除日時
        };

        // まずIndexedDBに保存(投稿をIndexedDBに保存する。indexedDB.jsのsavePost関数を呼び出す)
        const postId = await savePost(postData);
        //投稿のIDをコンソールに出力
        console.log("投稿をIndexedDBに保存しました。ID:", postId);

        // オンライン + 即座投稿の場合(オンラインかつ即座投稿の場合)
        if (isOnline && network_flag === 1) {
            try {
                // 保存した投稿データを取得(投稿データを取得する)
                const savedPost = { ...postData, post_id: postId };

                // Instagram投稿処理を実行(Instagram投稿処理を実行する。instagramGraphAPI.jsのprocessInstagramPost関数を呼び出す)
                const response = await processInstagramPost(savedPost);

                //投稿が成功しなかった場合
                if (!response.success) {throw new Error(response.error);}
            } catch (error) {
                //エラーをコンソールに出力
                console.error("投稿中にエラーが発生しました:", error);
            }
        }
        // フォームをリセット(フォームをリセットする)
        setImage_url(null);
        //キャプションをクリア
        setCaption("");
        //投稿日時をクリア
        setPost_date("");
        //キャプションの文字数を更新
        setCaptionStats(calculateCaptionStats(""));

    } catch (error) {//エラーをコンソールに出力
        //エラーをコンソールに出力
        console.error("保存中にエラーが発生しました:", error);
    } finally {
        //保存中にする
        setIsSaving(false);
    }
};

  //ヘッダーの高さ
  const headerHeight = 60
  //フッターの高さ
  const footerHeight = 180

  return (//HTML部分(オフライン予約投稿を表示する)
    <div className="w-full max-w-md mx-auto bg-white relative" style={{ height: viewportHeight || "100vh" }}>
      {/* ヘッダー - 固定 */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-white"
        //ヘッダーの高さを設定
        style={{ height: headerHeight }}
      >
        {/* タイトル */}
        <h1 className="text-lg font-bold">オフライン予約投稿</h1>
        {/* アイコン */}
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
        //ヘッダーの高さを設定
        style={{
          top: headerHeight,
          //フッターの高さを設定
          bottom: footerHeight,
          //スクロールの動きを設定
          WebkitOverflowScrolling: "touch",
          //スクロールの動きを設定
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
            {/* 画像が選択されている場合 */}
            {image_url ? (
              //画像を表示
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
              //画像が選択されていない場合
              <>
                {/* 画像が選択されていない場合 */}
                <div className="w-12 h-12 mb-2 text-gray-300">
                  {/* 画像 */}
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
                {/* 写真を選択 */}
                <p className="text-blue-700 text-sm font-medium">写真を選択</p>
                {/* JPG、PNG対応（最大30MB） */}
                <p className="text-gray-500 text-xs mt-1">JPG、PNG対応（最大30MB）</p>
              </>
            )}
            {/* 画像を選択 */}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
          </label>

          {/* キャプション入力 */}
          <div>
            <textarea
              //placeholder="キャプションを入力... (ハッシュタグも含めて)"
              value={caption}
              //キャプションを更新
              onChange={handleCaptionChange}
              //キャプションの文字数を設定
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-32"
              maxLength={2200}
              style={{ WebkitAppearance: "none" }}
            />
            {/* キャプションの文字数を表示 */}
            <div className="flex justify-between text-xs mt-1">
              <div className="text-gray-500">
                {/* キャプションの文字数を表示 */}
                <span className={captionStats.isCharLimitExceeded ? "text-red-500" : ""}>
                  {captionStats.charCount}/2,200文字
                </span>
              </div>
            </div>
          </div>

          {/* Instagram制限事項の表示 */}
          <div className="border border-gray-200 rounded-lg">
            {/* ボタン */}
            <button
              //type="button"はボタンの種類を設定
              type="button"
              className="w-full p-3 text-left flex items-center justify-between bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              // ボタンをクリックしたときにshowLimitationsを非表示にする(制限事項)
              onClick={() => setShowLimitations(!showLimitations)}
            >
              {/* タイトル */}
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
            {/* 制限事項を表示 */}
            {showLimitations && (
              //制限事項を表示
              <div className="p-3 border-t border-gray-200 bg-blue-50">
                <ul className="text-xs text-blue-700 space-y-1">
                  {/* キャプション */}
                  <li>
                    • <strong>キャプション:</strong> 最大2,200文字
                  </li>
                  {/* ハッシュタグ */}
                  <li>
                    • <strong>ハッシュタグ:</strong> 最大30個（推奨は5-10個）
                  </li>
                  {/* 予約投稿 */}
                  <li>
                    • <strong>予約投稿:</strong> 15分以上先〜75日以内
                  </li>
                  {/* 画像形式 */}
                  <li>
                    • <strong>画像形式:</strong> JPG、PNG対応
                  </li>
                  {/* 画像サイズ */}
                  <li>
                    • <strong>画像サイズ:</strong> 最大30MB
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* 投稿時刻オプション */}
          <div>
            {/* 投稿時刻 */}
            <h2 className="text-base font-bold mb-3">投稿時刻</h2>
            <div className="space-y-3">
              {/* 日時を指定 */}
              <div className="flex items-center">
                {/* 日時を指定 */}
                <div
                  className={`w-4 h-4 rounded-full border-2 border-gray-400 mr-3 flex items-center justify-center cursor-pointer ${network_flag === 0 ? "border-blue-700" : ""}`}
                  // ボタンをクリックしたときにnetwork_flagを0にする(日時を指定)
                  onClick={() => setNetwork_flag(0)}
                >
                  {/* ボタンをクリックしたときにnetwork_flagを0にする(日時を指定) */}
                  {network_flag === 0 && <div className="w-2 h-2 rounded-full bg-blue-700"></div>}
                </div>
                {/* 日時を指定 */}
                <label className="text-sm cursor-pointer" onClick={() => setNetwork_flag(0)}>
                  日時を指定
                </label>
              </div>

              {network_flag === 0 && (
                //日時を指定
                <div className="ml-7">
                  {/* 日時を指定 */}
                  <input
                    //type="datetime-local"は日時を指定
                    type="datetime-local"
                    //value={post_date}は日時を指定
                    value={post_date}
                    //onChange={(e) => setPost_date(e.target.value)}は日時を指定
                    onChange={(e) => setPost_date(e.target.value)}
                    //min={minDateTime}は日時を指定
                    min={minDateTime}
                    //max={maxDateTime}は日時を指定
                    max={maxDateTime}
                    //className="w-full border border-gray-200 rounded-lg p-2 text-sm"は日時を指定
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                    style={{ WebkitAppearance: "none" }}
                  />
                  {/* 日時を指定 */}
                  <p className="text-xs text-gray-500 mt-1">※ 15分以上先〜75日以内で設定してください</p>
                </div>
              )}

              {/* インターネット接続時に投稿 */}
              <div className="flex items-center">
                <div
                  className={`w-4 h-4 rounded-full border-2 border-gray-400 mr-3 flex items-center justify-center cursor-pointer ${network_flag === 1 ? "border-blue-700" : ""}`}
                  // ボタンをクリックしたときにnetwork_flagを1にする(インターネット接続時に投稿)
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
        //フッターの高さを設定
        style={{ height: footerHeight }}
      >
        {/* ボタン */}
        <button
          className="w-full bg-[#f47458] text-white rounded-lg py-3 text-base font-medium disabled:opacity-50"
          // ボタンをクリックしたときにhandleSaveを呼び出す(保存ボタン)
          onClick={handleSave}
          // 保存中にする
          disabled={isSaving}
        >
          {/* ボタンのテキストを決定する関数 */}
          {isSaving ? "処理中..." : getButtonText()}
        </button>

        {/* 状況説明テキストを表示 */}
        <p className="text-xs text-gray-500 text-center mt-3">{getStatusText()}</p>

        {/* 新規投稿と保存済みのボタン */}
        <div className="flex justify-center space-x-8 mt-4 pb-4">
          <button className="text-xs text-blue-600 font-medium">新規投稿</button>
          <button className="text-xs text-gray-500">保存済み</button>
        </div>
      </div>
    </div>
  )
}
//OfflinePostSchedulerコンポーネントをexport(他のファイルから呼び出せるようにする)
export default OfflinePostScheduler
