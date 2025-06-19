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

// // 投稿をAPIに送信する関数（実際のAPIエンドポイントに置き換えてください）
// export const sendPostToAPI = async (post) => {
//   // この例では、実際のAPIエンドポイントの代わりにタイムアウトを使用
//   // 実際のアプリでは、ここで実際のAPIリクエストを行います
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       console.log("投稿を送信しました:", {
//         caption: post.caption,
//         image: post.image ? "Image data included" : "No image",
//         postingOption: post.postingOption,
//         scheduledDateTime: post.scheduledDateTime,
//       })
//       resolve({ success: true, message: "投稿が完了しました" })
//     }, 1500)
//   })
// }

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


// オンラインになったときに投稿を処理する
// export const processPostsWhenOnline = async (setNotification = () => {}) => {
//   try {
//     // インターネット接続時に投稿するオプションが選択された投稿を取得
//     const posts = await getAllPosts("PENDING")
//     const postsToSend = posts.filter((post) => post.network_flag === 1) // 1 = 接続時に投稿

//     if (postsToSend.length === 0) {
//       return
//     }

//     setNotification({
//       type: "info",
//       message: `${postsToSend.length}件の投稿を処理中...`,
//     })

//     // 各投稿を処理
//     for (const post of postsToSend) {
//       try {
//         // APIに投稿を送信
//         const result = await postToInstagram(post)

//         if (result.success) {
//           // 投稿が成功したら、ステータスを更新
//           await updatePostStatus(post.post_id, "POSTED")
//           setNotification({
//             type: "success",
//             message: `投稿ID: ${post.post_id} の投稿が完了しました`,
//           })
//         } else {
//           // 投稿が失敗したら、ステータスを更新
//           await updatePostStatus(post.post_id, "FAILED")
//           setNotification({
//             type: "error",
//             message: `投稿ID: ${post.post_id} の投稿に失敗しました: ${result.message}`,
//           })
//         }
//       } catch (error) {
//         console.error("投稿の処理中にエラーが発生しました:", error)
//         await updatePostStatus(post.post_id, "FAILED")
//         setNotification({
//           type: "error",
//           message: `投稿ID: ${post.post_id} の投稿に失敗しました: ${error.message}`,
//         })
//       }
//     }

//     setNotification({
//       type: "success",
//       message: "全ての投稿処理が完了しました",
//     })

//     return true
//   } catch (error) {
//     console.error("投稿の処理中にエラーが発生しました:", error)
//     setNotification({
//       type: "error",
//       message: `投稿処理中にエラーが発生しました: ${error.message}`,
//     })
//     return false
//   }
// }

