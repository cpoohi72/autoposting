import { getAllPosts, updatePostStatus } from "./indexedDB"
import { postToInstagram } from "./instagramGraphAPI"
import { processInstagramPost } from './instagramGraphAPI';

// ネットワーク状態を監視する
export const setupNetworkMonitoring = (callback) => {
  const handleOnline = () => {
    console.log("オンラインになりました")
    callback(true)
  }

  const handleOffline = () => {
    console.log("オフラインになりました")
    callback(false)
  }

  window.addEventListener("online", handleOnline)
  window.addEventListener("offline", handleOffline)

  // 初期状態を返す
  callback(navigator.onLine)

  // クリーンアップ関数を返す
  return () => {
    window.removeEventListener("online", handleOnline)
    window.removeEventListener("offline", handleOffline)
  }
}

export const processPostsWhenOnline = async (setNotification = () => {}) => {
  try {
    // PENDING状態の投稿を取得
    const posts = await getAllPosts("PENDING");
    const postsToSend = posts.filter((post) => post.network_flag === 1); // 1 = 接続時に投稿

    if (postsToSend.length === 0) {
      return;
    }

    setNotification({
      type: "info",
      message: `${postsToSend.length}件の投稿を処理中...`,
    });

    // 各投稿を処理
    for (const post of postsToSend) {
      try {
        const result = await processInstagramPost(post);

        if (result.success) {
          setNotification({
            type: "success",
            message: `投稿ID: ${post.post_id} の投稿が完了しました`,
          });
        } else {
          setNotification({
            type: "error",
            message: `投稿ID: ${post.post_id} の投稿に失敗しました`,
          });
        }
      } catch (error) {
        console.error("投稿の処理中にエラーが発生しました:", error);
        setNotification({
          type: "error",
          message: `投稿ID: ${post.post_id} の投稿に失敗しました: ${error.message}`,
        });
      }
    }

    setNotification({
      type: "success",
      message: "全ての投稿処理が完了しました",
    });

    return true;
  } catch (error) {
    console.error("投稿の処理中にエラーが発生しました:", error);
    setNotification({
      type: "error",
      message: `投稿処理中にエラーが発生しました: ${error.message}`,
    });
    return false;
  }
};