// IndexedDBのデータベース名
const DB_NAME = "offlinePostsDB"
// データベースのバージョン。バージョン変えると旧データベースが削除される。今はこのままで問題ない。
const DB_VERSION = 2
// データベースのストア名(テーブル名)
//下の関数でデータベースを開く時に使用する
const STORE_NAME = "posts"

// データベースを開く関数
export const openDB = () => {
  //resolveは成功時の処理、rejectは失敗時の処理が引数として渡される
  return new Promise((resolve, reject) => {
    //indexedDB.openはデータベースを開く
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    // データベースの構造をセットアップ（初回または更新時）
    //eventはイベントオブジェクト
    //イベントオブジェクトとは、イベントが発生したときに自動で作成されるオブジェクト
    //onupgradeneededはデータベースの構造をセットアップするためのイベント。そのイベントの戻り値がdbで、eventとして渡される
    request.onupgradeneeded = (event) => {
      //event.target.resultはデータベースオブジェクト
      //変数dbにデータベースオブジェクトを代入
      const db = event.target.result

      // 既存のオブジェクトストアがある場合は削除
      if (db.objectStoreNames.contains(STORE_NAME)) {
        //既存のストア(テーブル)を削除
        db.deleteObjectStore(STORE_NAME)
      }

      // 新しいスキーマで'posts'オブジェクトストアを作成
      //createObjectStoreは新しいストア(テーブル)を作成する
      const objectStore = db.createObjectStore(STORE_NAME, {
        //keyPathは主キー
        keyPath: "post_id",
        //autoIncrementは主キーを自動で増やす
        autoIncrement: true,
      })

      // インデックスを作成（検索を高速化するため）
      //createIndexはインデックスを作成する
      //uniqueはインデックスが一意かどうか
      //post_dateはインデックスの名前
      //post_dateはインデックスのキー
      //unique: falseはインデックスが一意ではない
      objectStore.createIndex("post_date", "post_date", { unique: false })
      objectStore.createIndex("post_status", "post_status", { unique: false })
      objectStore.createIndex("network_flag", "network_flag", { unique: false })
      objectStore.createIndex("created_at", "created_at", { unique: false })
      objectStore.createIndex("delete_flag", "delete_flag", { unique: false })
    }
    //onsuccessはデータベースを開けたときの処理
    //↑のイベントを引数として渡す
    request.onsuccess = (event) => {
      //event.target.resultはデータベースオブジェクト
      //変数dbにデータベースオブジェクトを代入
      const db = event.target.result
      //resolveは成功時の処理、dbを引数として渡す
      resolve(db)
    }
    //onerrorはデータベースを開けなかったときの処理
    //↑のイベントを引数として渡す
    request.onerror = (event) => {
      //event.target.errorはエラー
      //rejectは失敗時の処理、エラーを引数として渡す
      const error = event.target.error
      //エラーを表示
      reject(`データベースを開けませんでした: ${error?.message || "Unknown error"}`)
    }
  })
}

// 投稿を保存
//postDataは投稿データ
//asyncは非同期処理を行うためのキーワード(非同期処理をするための宣言的なもの)
//awaitは非同期処理が終わるまで待つ
export const savePost = async (postData) => {
  try {
    //openDBはデータベースを開く関数
    //awaitは非同期処理が終わるまで待つ
    const db = await openDB()
    //Promiseは非同期処理を行うためのオブジェクト
    return new Promise((resolve, reject) => {
      //transactionはトランザクションを作成する
      //readwriteは読み書き可能のトランザクションとして宣言している
      const transaction = db.transaction([STORE_NAME], "readwrite")
      //objectStoreはストア(テーブル)を取得する
      const store = transaction.objectStore(STORE_NAME)

      // データベース設計に合わせた投稿データを作成
      const post = {
        //引数として渡されたpostDataから情報を取得する
        image_url: postData.image_url, // Base64画像データ
        caption: postData.caption, // 投稿の文章
        post_date: postData.post_date, // 投稿予約時間
        post_status: postData.post_status, // 投稿の状態
        network_flag: postData.network_flag, // ネット接続時に投稿かどうか
        delete_flag: postData.delete_flag, // 削除フラグ（デフォルトは0）
        created_at: postData.created_at, // 作成日時
        updated_at: postData.updated_at, // 更新日時（初期はnull）
        deleted_at: postData.deleted_at, // 削除日時（初期はnull）
      }

      //addでデータを追加し、requestに代入
      const request = store.add(post)

      //onsucessはデータを追加したときの処理
      //↑のイベントを引数として渡す
      request.onsuccess = (event) => {
        // 作成日時をISO文字列形式で保存
        post.created_at = new Date().toISOString()
        //putでデータを更新。postはデータ、updateRequestは更新したデータを代入
        const updateRequest = store.put(post)

        //変数resultに追加成功後のデータを代入
        const result = event.target.result

        console.log("投稿保存成功 ID:", result)
        //resolveは成功時の処理、resultを引数として渡す
        resolve(result) // 生成されたpost_idを返す
      }
      //onerrorはデータを追加できなかったときの処理
      request.onerror = (event) => {
        //エラーを出力する処理群
        const error = event.target.error
        console.error("投稿保存エラー:", error)
        reject(`投稿の保存に失敗しました: ${error?.message || "Unknown error"}`)
      }
    })
  } catch (error) {
    console.error("投稿の保存中にエラーが発生しました:", error)
    throw error
  }
}

// 投稿のステータスを更新(networkStatus.jsで使用)
//post_idは投稿ID、statusはステータス
//これを呼び出す時に更新したいpost_idとstatusを引数として渡す。フロントで呼び出す時に選択する
//asyncは非同期処理を行うためのキーワード(非同期処理をするための宣言的なもの)
//awaitは非同期処理が終わるまで待つ
export const updatePostStatus = async (post_id, status) => {
  try {
    //データベースを開く
    const db = await openDB()
    //Promiseは非同期処理を行うためのオブジェクト
    return new Promise((resolve, reject) => {
      //transactionでトランザクションの作成
      //読み書き可能のトランザクションとして宣言している
      const transaction = db.transaction([STORE_NAME], "readwrite")
      //objectStoreはストア(テーブル)を取得する
      const store = transaction.objectStore(STORE_NAME)

      //引数として渡されたpost_idから投稿データを取得
      const getRequest = store.get(post_id)
      //取得ができた時の処理
      getRequest.onsuccess = (event) => {
        //変数postに取得した投稿データを代入
        const post = event.target.result
        //投稿が存在する場合
        if (post) {
          // ステータスを更新する
          //post.post_statusは投稿のステータス
          //statusは引数として渡されたステータス
          post.post_status = status

          // 更新した投稿を保存。putでデータを更新。postはデータ、updateRequestは更新後のデータを代入
          const updateRequest = store.put(post)

          //updateRequest.onsuccessはデータを更新したときの処理
          //↑のイベントを引数として渡す
          updateRequest.onsuccess = () => {
            //console.logはコンソールにログを出力
            console.log(`投稿ID ${post_id} のステータスを ${status} に更新しました`)
            //resolveは成功時の処理、trueを引数として渡す
            resolve(true)
          }

          //onerrorはデータを更新できなかったときの処理
          //↑のイベントを引数として渡す
          updateRequest.onerror = (event) => {
            //エラーを出力する処理群
            const error = event.target.error
            reject(`投稿の更新に失敗しました: ${error?.message || "Unknown error"}`)
          }
        } else {
          //投稿が存在しない場合
          reject(`post_id ${post_id} の投稿が見つかりませんでした`)
        }
      }

      //getRequest.onerrorはデータを取得できなかったときの処理
      //↑のイベントを引数として渡す
      getRequest.onerror = (event) => {
        //エラーを出力する処理群
        const error = event.target.error
        //rejectは失敗時の処理、エラーを引数として渡す
        reject(`投稿の取得に失敗しました: ${error?.message || "Unknown error"}`)
      }
    })
  } catch (error) {
    //エラーを出力する処理群
    console.error("投稿の更新中にエラーが発生しました:", error)
    throw error
  }
}

// すべての投稿を取得（削除されていないもののみ、ステータスでフィルタリング可能）
//asyncは非同期処理を行うためのキーワード(非同期処理をするための宣言的なもの)
//awaitは非同期処理が終わるまで待つ
export const getAllPosts = async (status = null) => {
  try {
    //データベースを開く
    const db = await openDB()
    //Promiseは非同期処理を行うためのオブジェクト
    return new Promise((resolve, reject) => {
      //読み取り専用としてトランザクションを作成
      const transaction = db.transaction([STORE_NAME], "readonly")
      //objectStoreはストア(テーブル)を取得する
      const store = transaction.objectStore(STORE_NAME)
      //getAllはすべてのデータを取得する
      const request = store.getAll()

      //request.onsuccessはデータを取得したときの処理
      //↑のイベントを引数として渡す
      request.onsuccess = (event) => {
        //event.target.resultはデータベースオブジェクト
        //変数postsにデータベースオブジェクトを代入
        let posts = event.target.result

        //postsはデータベースオブジェクト
        //post.delete_flagはデータベースオブジェクトのdelete_flag
        // 削除されていない投稿のみ(post.delete_flagが0のもの)をフィルタリング
        posts = posts.filter((post) => !post.delete_flag)

        // ステータスが指定されている場合はフィルタリング
        if (status !== null) {
          //post.post_statusは投稿のステータス
          //statusは引数として渡されたステータス
          //statusがnullでない場合は、statusとpost.post_statusが一致するものをフィルタリング
          posts = posts.filter((post) => post.post_status === status)
        }

        // 作成日時の降順でソート（新しいものが先頭）
        posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        console.log(`投稿取得成功: ${posts.length}件`)
        //resolveは成功時の処理、postsを引数として渡す
        resolve(posts)
      }

      //request.onerrorはデータを取得できなかったときの処理
      //↑のイベントを引数として渡す
      request.onerror = (event) => {
        //エラーを出力する処理群
        const error = event.target.error
        reject(`投稿の取得に失敗しました: ${error?.message || "Unknown error"}`)
      }
    })
  } catch (error) {
    //エラーを出力する処理群
    console.error("投稿の取得中にエラーが発生しました:", error)
    throw error
  }
}

// 投稿を論理削除する関数（delete_flagを1に設定）
//asyncは非同期処理を行うためのキーワード(非同期処理をするための宣言的なもの)
//awaitは非同期処理が終わるまで待つ
export const deletePost = async (post_id) => {
  try {
    //データベースを開く
    const db = await openDB()
    //Promiseは非同期処理を行うためのオブジェクト
    return new Promise((resolve, reject) => {
      //読み書き可能のトランザクションとして宣言している
      const transaction = db.transaction([STORE_NAME], "readwrite")
      //objectStoreはストア(テーブル)を取得する
      const store = transaction.objectStore(STORE_NAME)

      // 引数として渡されたpost_idから投稿データを取得
      const getRequest = store.get(post_id)
      //取得ができた時の処理
      getRequest.onsuccess = (event) => {
        //event.target.resultはデータベースオブジェクト
        //変数postにデータベースオブジェクトを代入
        const post = event.target.result
        //投稿が存在する場合
        if (post) {
          // 論理削除フラグを設定
          //post.delete_flagは投稿の削除フラグ
          //post.deleted_atは投稿の削除日時
          post.delete_flag = 1
          post.deleted_at = new Date().toISOString() // ISO文字列形式で統一

          // 更新した投稿を保存
          const updateRequest = store.put(post)

          //updateRequest.onsuccessはデータを更新したときの処理
          //↑のイベントを引数として渡す
          updateRequest.onsuccess = () => {
            //console.logはコンソールにログを出力
            console.log(`投稿ID ${post_id} を削除しました`)
            resolve(true)
          }

          //updateRequest.onerrorはデータを更新できなかったときの処理
          //↑のイベントを引数として渡す
          updateRequest.onerror = (event) => {
            //エラーを出力する処理群
            const error = event.target.error
            reject(`投稿の削除に失敗しました: ${error?.message || "Unknown error"}`)
          }
        } else {
          //投稿が存在しない場合
          reject(`post_id ${post_id} の投稿が見つかりませんでした`)
        }
      }

      //getRequest.onerrorはデータを取得できなかったときの処理
      //↑のイベントを引数として渡す
      getRequest.onerror = (event) => {
        //エラーを出力する処理群
        const error = event.target.error
        reject(`投稿の取得に失敗しました: ${error?.message || "Unknown error"}`)
      }
    })
  } catch (error) {
    //エラーを出力する処理群
    console.error("投稿の削除中にエラーが発生しました:", error)
    throw error
  }
}

// 特定の投稿を取得
//asyncは非同期処理を行うためのキーワード(非同期処理をするための宣言的なもの)
//awaitは非同期処理が終わるまで待つ
export const getPostById = async (post_id) => {
  try {
    //データベースを開く
    const db = await openDB()
    //Promiseは非同期処理を行うためのオブジェクト
    return new Promise((resolve, reject) => {
      //読み取り専用としてトランザクションを作成
      const transaction = db.transaction([STORE_NAME], "readonly")
      //objectStoreはストア(テーブル)を取得する
      const store = transaction.objectStore(STORE_NAME)
      //getは引数として渡されたpost_idから投稿データを取得
      const request = store.get(post_id)

      //request.onsuccessはデータを取得したときの処理
      //↑のイベントを引数として渡す
      request.onsuccess = (event) => {
        //event.target.resultはデータベースオブジェクト
        //変数postにデータベースオブジェクトを代入
        const post = event.target.result
        //投稿が存在する場合
        if (post && !post.delete_flag) {
          //resolveは成功時の処理、postを引数として渡す
          resolve(post)
        } else {
          //投稿が存在しない場合nullを返す
          resolve(null)
        }
      }

      //request.onerrorはデータを取得できなかったときの処理
      //↑のイベントを引数として渡す
      request.onerror = (event) => {
        const error = event.target.error
        reject(`投稿の取得に失敗しました: ${error?.message || "Unknown error"}`)
      }
    })
  } catch (error) {
    //エラーを出力する処理群
    console.error("投稿の取得中にエラーが発生しました:", error)
    throw error
  }
}

// 予約投稿の一覧を取得（投稿日時でソート）
//asyncは非同期処理を行うためのキーワード(非同期処理をするための宣言的なもの)
//awaitは非同期処理が終わるまで待つ
export const getScheduledPosts = async () => {
  try {
    //データベースを開く
    const db = await openDB()
    //Promiseは非同期処理を行うためのオブジェクト
    return new Promise((resolve, reject) => {
      //読み取り専用としてトランザクションを作成
      const transaction = db.transaction([STORE_NAME], "readonly")
      //objectStoreはストア(テーブル)を取得する
      const store = transaction.objectStore(STORE_NAME)
      //getAllはすべてのデータを取得する
      const request = store.getAll()

      //request.onsuccessはデータを取得したときの処理
      //↑のイベントを引数として渡す
      request.onsuccess = (event) => {
        //event.target.resultはデータベースオブジェクト
        //変数postsにデータベースオブジェクトを代入
        let posts = event.target.result

        //postsはデータベースオブジェクト
        //post.delete_flagはデータベースオブジェクトのdelete_flag
        //post.post_dateはデータベースオブジェクトのpost_date
        //post.post_statusはデータベースオブジェクトのpost_status
        //post.network_flagはデータベースオブジェクトのnetwork_flag
        posts = posts.filter(
          //削除されていないかつ、投稿日時があり、ステータスがPENDINGであり、ネットワークフラグが0(ネット接続時に投稿ではない)のものをフィルタリング
          (post) => !post.delete_flag && post.post_date && post.post_status === "PENDING" && post.network_flag === 0, // 日時指定投稿
        )

        // 投稿日時の昇順でソート（早いものが先頭）
        posts.sort((a, b) => {
          if (!a.post_date || !b.post_date) return 0
          return new Date(a.post_date).getTime() - new Date(b.post_date).getTime()
        })

        console.log(`予約投稿取得成功: ${posts.length}件`)
        //resolveは成功時の処理、postsを引数として渡す
        resolve(posts)
      }

      //request.onerrorはデータを取得できなかったときの処理
      //↑のイベントを引数として渡す
      request.onerror = (event) => {
        const error = event.target.error
        reject(`予約投稿の取得に失敗しました: ${error?.message || "Unknown error"}`)
      }
    })
  } catch (error) {
    //エラーを出力する処理群
    console.error("予約投稿の取得中にエラーが発生しました:", error)
    throw error
  }
}

/**
 * 投稿のimage_urlとpost_statusを更新
 * @param {number} postId - 投稿ID
 * @param {string} imageUrl - 新しい画像URL（S3の公開URL）
 * @param {string} status - 新しいステータス
 */
//asyncは非同期処理を行うためのキーワード(非同期処理をするための宣言的なもの)
//awaitは非同期処理が終わるまで待つ
//更新したい投稿のpostId、imageUrl、更新後のstatusを引数として渡す
export const updatePostImageAndStatus = async (postId, imageUrl, status) => {
  try {
    //データベースを開く
    const db = await openDB();
    //Promiseは非同期処理を行うためのオブジェクト
    return new Promise((resolve, reject) => {
      //読み書き可能のトランザクションとして宣言している
      const transaction = db.transaction([STORE_NAME], "readwrite");
      //objectStoreはストア(テーブル)を取得する
      const store = transaction.objectStore(STORE_NAME);

      //getは引数として渡されたpostIdから投稿データを取得
      const getRequest = store.get(postId);

      //getRequest.onsuccessはデータを取得したときの処理
      //↑のイベントを引数として渡す
      getRequest.onsuccess = (event) => {
        //event.target.resultはデータベースオブジェクト
        //変数postにデータベースオブジェクトを代入
        const post = event.target.result;
        //投稿が存在する場合
        if (post) {
          //更新を行う
          //post.image_urlは投稿の画像URL
          //post.post_statusは投稿のステータス
          //post.updated_atは投稿の更新日時
          post.image_url = imageUrl;
          post.post_status = status;
          post.updated_at = new Date().toISOString();

          //データを更新する
          //updateRequest.onsuccessはデータを更新したときの処理
          //↑のイベントを引数として渡す
          const updateRequest = store.put(post);

          //updateRequest.onsuccessはデータを更新したときの処理
          //↑のイベントを引数として渡す
          updateRequest.onsuccess = () => {
            //console.logはコンソールにログを出力
            console.log(`投稿ID ${postId} の画像URLとステータスを更新しました`);
            resolve(post);
          };

          //updateRequest.onerrorはデータを更新できなかったときの処理
          //↑のイベントを引数として渡す
          updateRequest.onerror = (error) => {
            reject(`投稿の更新に失敗しました: ${error.target.error}`);
          };
        } else {
          reject(`投稿ID ${postId} が見つかりません`);
        }
      };

      //getRequest.onerrorはデータを取得できなかったときの処理
      //↑のイベントを引数として渡す
      getRequest.onerror = (error) => {
        reject(`投稿の取得に失敗しました: ${error.target.error}`);
      };
    });
  } catch (error) {
    //エラーを出力する処理群
    console.error("投稿の更新中にエラーが発生しました:", error);
    throw error;
  }
};
