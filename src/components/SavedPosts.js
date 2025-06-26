//保存された投稿を表示するコンポーネント App.jsから呼び出される
"use client"

//useStateとuseEffectのインポート
import { useState, useEffect } from "react"
//indexedDB.jsのgetAllPosts関数、deletePost関数をインポート
import { getAllPosts, deletePost } from "../utils/indexedDB"

//SavedPostsコンポーネントの定義
function SavedPosts({ isOnline, setNotification }) {
  //投稿を管理
  const [posts, setPosts] = useState([])
  //読み込み中かどうかを管理
  const [loading, setLoading] = useState(true)
  //エラーがあるかどうかを管理
  const [error, setError] = useState(null)
  //投稿済みの投稿を表示するかどうかを管理
  const [showPosted, setShowPosted] = useState(false)

  // 投稿を取得(getAllPosts関数を呼び出す)
  const fetchPosts = async () => {
    try {
      //読み込み中にする
      setLoading(true)
      //投稿を取得
      const fetchedPosts = await getAllPosts()

      //投稿済みの投稿を表示する場合
      const filteredPosts = showPosted ? fetchedPosts : fetchedPosts.filter((post) => post.post_status !== "POSTED")

      //投稿を設定
      setPosts(filteredPosts)
      //エラーをクリア
      setError(null)
    } catch (err) {
      //エラーを設定
      setError("投稿の取得に失敗しました")
      //コンソールにエラーを出力
      console.error(err)
    } finally {
      //読み込み中にする
      setLoading(false)
    }
  }

  // 投稿を削除(deletePost関数を呼び出す)
  const handleDelete = async (id) => {
    if (window.confirm("この投稿を削除してもよろしいですか？")) {
      try {
        //投稿を削除
        await deletePost(id)
        //投稿を取得
        fetchPosts()
        //通知を設定
        setNotification({
          type: "success",
          message: "投稿を削除しました",
        })
      } catch (err) {
        //エラーを設定
        setError("投稿の削除に失敗しました")
        //コンソールにエラーを出力
        console.error(err)
        //通知を設定
        setNotification({
          type: "error",
          message: "投稿の削除に失敗しました",
        })
      }
    }
  }

  //投稿を取得
  useEffect(() => {
    //投稿を取得
    fetchPosts()
  }, [showPosted, isOnline]) //showPostedは投稿済みの投稿を表示するかどうか、isOnlineはオンラインかどうか。この2つが変更されたときにfetchPostsを呼び出す。

  // 日時のフォーマット(投稿日時をフォーマットする)
  const formatDate = (dateString) => {
    //dateStringがない場合(投稿日時がない場合)
    if (!dateString) return "接続時に投稿"
    //dateStringをDateオブジェクトに変換
    const date = new Date(dateString)
    //日時をフォーマット
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 投稿ステータスに基づいたラベルとスタイルを取得(投稿ステータスに基づいてラベルとスタイルを取得する)
  const getStatusLabel = (status) => {
    //statusによってラベルとスタイルを取得
    switch (status) {
      case "POSTED":
        //投稿済みの場合
        return { label: "投稿済み", className: "bg-green-100 text-green-800" }
      case "FAILED":
        //投稿失敗の場合
        return { label: "投稿失敗", className: "bg-red-100 text-red-800" }
      case "PENDING":
        //投稿待ちの場合
        return { label: "投稿待ち", className: "bg-yellow-100 text-yellow-800" }
      default:
        //投稿待ちの場合
        return { label: "投稿待ち", className: "bg-yellow-100 text-yellow-800" }
    }
  }

  return (
    //HTML部分(保存された投稿(投稿待ち、投稿失敗、投稿済み)を表示する)
    <div className="max-w-md mx-auto h-screen flex flex-col p-4">
      <h2 className="text-xl font-bold mb-3">保存済み投稿</h2>

      {/* 表示切替スイッチ(投稿済みの投稿を表示するかどうかを切り替える) */}
      <div className="flex items-center mb-3">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              //type="checkbox"はチェックボックス
              type="checkbox"
              //className="sr-only"はスクリーンリーダーには表示しない
              className="sr-only"
              //checked={showPosted}は投稿済みの投稿を表示するかどうか
              checked={showPosted}
              //onChange={() => setShowPosted(!showPosted)}は投稿済みの投稿を表示するかどうかを切り替える
              //onChangeはチェックボックスの状態が変更されたときに呼び出される
              onChange={() => setShowPosted(!showPosted)}
            />
            {/* チェックボックスの背景 */}
            <div className={`block w-8 h-5 rounded-full ${showPosted ? "bg-blue-600" : "bg-gray-300"}`}></div>
            {/* チェックボックスのドット */}
            <div
              className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition ${showPosted ? "transform translate-x-3" : ""}`}
            ></div>
          </div>
          {/* チェックボックスのラベル */}
          <div className="ml-2 text-gray-700 text-sm">投稿済みの投稿を表示</div>
        </label>
      </div>

      {/* 読み込み中の場合 */}
      {loading && <p className="text-center text-sm">読み込み中...</p>}

      {/* エラーがある場合 */}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* 読み込み中でなく、投稿がない場合 */}
      {!loading && posts.length === 0 && (
        <p className="text-center text-gray-500 text-sm">保存された投稿はありません</p>
      )}

      {/* スクロール可能な投稿リスト(投稿を表示する) */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {/* 保存されている投稿をすべて表示する */}
        {posts.map((post) => {
          //投稿ステータスに基づいてラベルとスタイルを取得
          const statusInfo = getStatusLabel(post.post_status)

          return (
            //投稿を表示(HTML部分)
            <div key={post.post_id} className="border rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  {/* 投稿ステータスに基づいてラベルとスタイルを取得 */}
                  <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.className}`}>{statusInfo.label}</span>
                  {/* 投稿日時を表示 */}
                  <p className="font-medium mt-1 text-sm">
                    {post.post_date ? `予定日時: ${formatDate(post.post_date)}` : "インターネット接続時に投稿"}
                  </p>
                </div>
                {/* 投稿を削除(handleDelete関数を呼び出す) */}
                <button onClick={() => handleDelete(post.post_id)} className="text-red-500 hover:text-red-700 text-sm">
                  削除
                </button>
              </div>

              {/* 投稿画像を表示 */}
              {post.image_url && (
                //投稿画像を表示(HTML部分)
                <img
                  src={post.image_url || "/placeholder.svg"}
                  alt="投稿画像"
                  className="w-full h-24 object-cover rounded-lg mb-2"
                />
              )}

              {/* 投稿キャプションを表示 */}
              {post.caption && <p className="text-gray-700 text-sm">{post.caption}</p>}

              {/* 作成日時を表示 */}
              <p className="text-xs text-gray-500 mt-1">作成日時: {formatDate(post.created_at)}</p>
            </div>
          )
        })}
      </div>

      {/* 更新ボタン(fetchPosts関数を呼び出す) */}
      <button onClick={fetchPosts} className="mt-3 w-full bg-blue-500 text-white rounded-lg py-2 text-sm">
        更新
      </button>
    </div>
  )
}
//SavedPostsコンポーネントをエクスポート(外部から呼び出すことができるようにする)
export default SavedPosts
