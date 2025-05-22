import React, { useState, useEffect } from 'react';
import { getAllPosts, deletePost } from '../utils/indexedDB';

function SavedPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 投稿を取得
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const fetchedPosts = await getAllPosts();
      setPosts(fetchedPosts);
      setError(null);
    } catch (err) {
      setError('投稿の取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 投稿を削除
  const handleDelete = async (id) => {
    if (window.confirm('この投稿を削除してもよろしいですか？')) {
      try {
        await deletePost(id);
        // 投稿リストを更新
        fetchPosts();
      } catch (err) {
        setError('投稿の削除に失敗しました');
        console.error(err);
      }
    }
  };

  // コンポーネントマウント時に投稿を取得
  useEffect(() => {
    fetchPosts();
  }, []);

  // 日時のフォーマット
  const formatDate = (dateString) => {
    if (!dateString) return '接続時に投稿';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">保存済み投稿</h2>
      
      {loading && <p className="text-center">読み込み中...</p>}
      
      {error && <p className="text-red-500">{error}</p>}
      
      {!loading && posts.length === 0 && (
        <p className="text-center text-gray-500">保存された投稿はありません</p>
      )}
      
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">
                {post.postingOption === 'specificTime' 
                  ? `予定日時: ${formatDate(post.scheduledDateTime)}` 
                  : 'インターネット接続時に投稿'}
              </p>
              <button 
                onClick={() => handleDelete(post.id)}
                className="text-red-500 hover:text-red-700"
              >
                削除
              </button>
            </div>
            
            {post.image && (
              <img 
                src={post.image || "/placeholder.svg"} 
                alt="投稿画像" 
                className="w-full h-40 object-cover rounded-lg mb-2" 
              />
            )}
            
            {post.caption && (
              <p className="text-gray-700">{post.caption}</p>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              作成日時: {formatDate(post.createdAt)}
            </p>
          </div>
        ))}
      </div>
      
      <button 
        onClick={fetchPosts}
        className="mt-4 w-full bg-blue-500 text-white rounded-lg py-2"
      >
        更新
      </button>
    </div>
  );
}

export default SavedPosts;