"use client"

import { useState, useEffect } from "react"
import { getAllPosts, deletePost } from "../utils/indexedDB"
import toast,{ Toaster } from "react-hot-toast"

function SavedPosts({ isOnline, setNotification }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPosted, setShowPosted] = useState(false)

  // 投稿を取得
  const fetchPosts = async () => {
    try {
      setLoading(true)
      const fetchedPosts = await getAllPosts()

      const filteredPosts = showPosted ? fetchedPosts : fetchedPosts.filter((post) => post.post_status !== "POSTED")

      setPosts(filteredPosts)
      setError(null)
    } catch (err) {
      setError("投稿の取得に失敗しました")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 投稿を削除
  const handleDelete = async (id) => {
    if (window.confirm("この投稿を削除してもよろしいですか？")) {
      try {
        await deletePost(id)
        fetchPosts()
        toast.success("投稿を削除しました", {
          duration: 3000,
          position: "top-center",
        })
      } catch (err) {
        setError("投稿の削除に失敗しました")
        console.error(err)
        toast.error("投稿の削除に失敗しました", {
          duration: 3000,
          position: "top-center",
        })
      }
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [showPosted, isOnline])

  // 日時のフォーマット
  const formatDate = (dateString) => {
    if (!dateString) return "接続時に投稿"
    const date = new Date(dateString)
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 投稿ステータスに基づいたラベルとスタイルを取得
  const getStatusLabel = (status) => {
    switch (status) {
      case "POSTED":
        return { label: "投稿済み", className: "bg-green-100 text-green-800" }
      case "FAILED":
        return { label: "投稿失敗", className: "bg-red-100 text-red-800" }
      case "PENDING":
      default:
        return { label: "投稿待ち", className: "bg-yellow-100 text-yellow-800" }
    }
  }

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col p-4">
      <h2 className="text-xl font-bold mb-3">保存済み投稿</h2>

      {/* 表示切替スイッチ */}
      <div className="flex items-center mb-3">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={showPosted}
              onChange={() => setShowPosted(!showPosted)}
            />
            <div className={`block w-8 h-5 rounded-full ${showPosted ? "bg-blue-600" : "bg-gray-300"}`}></div>
            <div
              className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition ${showPosted ? "transform translate-x-3" : ""}`}
            ></div>
          </div>
          <div className="ml-2 text-gray-700 text-sm">投稿済みの投稿を表示</div>
        </label>
      </div>

      {loading && <p className="text-center text-sm">読み込み中...</p>}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!loading && posts.length === 0 && (
        <p className="text-center text-gray-500 text-sm">保存された投稿はありません</p>
      )}

      {/* スクロール可能な投稿リスト */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {posts.map((post) => {
          const statusInfo = getStatusLabel(post.post_status)

          return (
            <div key={post.post_id} className="border rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.className}`}>{statusInfo.label}</span>
                  <p className="font-medium mt-1 text-sm">
                    {post.post_date ? `予定日時: ${formatDate(post.post_date)}` : "インターネット接続時に投稿"}
                  </p>
                </div>
                <button onClick={() => handleDelete(post.post_id)} className="text-red-500 hover:text-red-700 text-sm">
                  削除
                </button>
              </div>

              {post.image_url && (
                <img
                  src={post.image_url || "/placeholder.svg"}
                  alt="投稿画像"
                  className="w-full h-24 object-cover rounded-lg mb-2"
                />
              )}

              {post.caption && <p className="text-gray-700 text-sm">{post.caption}</p>}

              <p className="text-xs text-gray-500 mt-1">作成日時: {formatDate(post.created_at)}</p>
            </div>
          )
        })}
      </div>

      <button onClick={fetchPosts} className="mt-3 w-full bg-blue-500 text-white rounded-lg py-2 text-sm">
        更新
      </button>

      <Toaster />
    </div>
  )
}

export default SavedPosts
