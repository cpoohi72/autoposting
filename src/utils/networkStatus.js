// indexedDB.jsのgetAllPosts関数をインポート
import { getAllPosts, updatePostStatus } from "./indexedDB"
//消しても問題ないかと
import { postToInstagram } from "./instagramGraphAPI"
// instagramGraphAPI.jsのprocessInstagramPost関数をインポート
//この関数からそのファイルのいろいろな関数を呼び出す
import { processInstagramPost } from './instagramGraphAPI';

// ネットワーク状態を監視する関数
//callbackはネットワーク状態が変化したときに呼び出される関数
export const setupNetworkMonitoring = (callback) => {
  //オンラインになったときに呼び出される関数
  const handleOnline = () => {
    //コンソールにログを出力
    console.log("オンラインになりました")
    callback(true)
  }

  //オフラインになったときに呼び出される関数
  const handleOffline = () => {
    console.log("オフラインになりました")
    callback(false)
  }

  //オンラインになったときにhandleOnline関数を呼び出す
  window.addEventListener("online", handleOnline)
  //オフラインになったときにhandleOffline関数を呼び出す
  window.addEventListener("offline", handleOffline)

  // 初期状態を返す
  //navigator.onLineはネットワーク状態を取得する
  callback(navigator.onLine)

  // クリーンアップ関数を返す
  return () => {
    //オンラインになったときにhandleOnline関数を呼び出す
    window.removeEventListener("online", handleOnline)
    //オフラインになったときにhandleOffline関数を呼び出す
    window.removeEventListener("offline", handleOffline)
  }
}

// オンラインになったときに投稿を処理する関数
//setNotificationは通知を表示する関数App.jsから呼び出される。その時にsetNotificationが渡される。
export const processPostsWhenOnline = async (setNotification = () => {}) => {
  try {
    // PENDING状態(未投稿)の投稿を取得
    const posts = await getAllPosts("PENDING");
    //network_flagが1の投稿をpostsToSendに格納
    const postsToSend = posts.filter((post) => post.network_flag === 1); // 1 = 接続時に投稿

    //postsToSendが空の場合(投稿がない場合)
    if (postsToSend.length === 0) {
      //空の場合は何もしない
      return;
    }

    //通知を表示する
    setNotification({
      type: "info",
      message: `${postsToSend.length}件の投稿を処理中...`,
    });

    // 各投稿を処理
    for (const post of postsToSend) {
      try {
        //投稿の処理を行う(instagramGraphAPI.jsのprocessInstagramPost関数)
        const result = await processInstagramPost(post);

        //result.successがtrueの場合(投稿が成功)
        if (result.success) {
          //通知を表示する
          setNotification({
            type: "success",
            message: `投稿ID: ${post.post_id} の投稿が完了しました`,
          });
        } else {
          //result.successがfalseの場合(投稿が失敗)
          //通知を表示する
          setNotification({
            type: "error",
            message: `投稿ID: ${post.post_id} の投稿に失敗しました`,
          });
        }
      } catch (error) {
        console.error("投稿の処理中にエラーが発生しました:", error);
        //通知を表示する
        setNotification({
          type: "error",
          message: `投稿ID: ${post.post_id} の投稿に失敗しました: ${error.message}`,
        });
      }
    }

    //通知を表示する
    setNotification({
      type: "success",
      message: "全ての投稿処理が完了しました",
    });

    return true;
  } catch (error) {
    console.error("投稿の処理中にエラーが発生しました:", error);
    //通知を表示する
    setNotification({
      type: "error",
      message: `投稿処理中にエラーが発生しました: ${error.message}`,
    });
    return false;
  }
};