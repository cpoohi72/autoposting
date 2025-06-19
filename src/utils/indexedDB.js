// IndexedDBのデータベース名とバージョン
const DB_NAME = "offlinePostsDB"
const DB_VERSION = 2
const STORE_NAME = "posts"

// データベースを開く
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    // データベースの構造をセットアップ（初回または更新時）
    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // 既存のオブジェクトストアがある場合は削除
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME)
      }

      // 新しいスキーマで'posts'オブジェクトストアを作成
      const objectStore = db.createObjectStore(STORE_NAME, {
        keyPath: "post_id",
        autoIncrement: true,
      })

      // インデックスを作成（検索を高速化するため）
      objectStore.createIndex("post_date", "post_date", { unique: false })
      objectStore.createIndex("post_status", "post_status", { unique: false })
      objectStore.createIndex("network_flag", "network_flag", { unique: false })
      objectStore.createIndex("created_at", "created_at", { unique: false })
      objectStore.createIndex("delete_flag", "delete_flag", { unique: false })
    }

    request.onsuccess = (event) => {
      const db = event.target.result
      resolve(db)
    }

    request.onerror = (event) => {
      const error = event.target.error
      reject(`データベースを開けませんでした: ${error?.message || "Unknown error"}`)
    }
  })
}

// 投稿を保存
export const savePost = async (postData) => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)

      // データベース設計に合わせた投稿データを作成
      const post = {
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

      const request = store.add(post)

      request.onsuccess = (event) => {
        post.created_at = new Date().toISOString() // 作成日時をISO文字列形式で保存
        const updateRequest = store.put(post)

        const result = event.target.result
        console.log("投稿保存成功 ID:", result)
        resolve(result) // 生成されたpost_idを返す
      }

      request.onerror = (event) => {
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
export const updatePostStatus = async (post_id, status) => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)

      // まず投稿を取得
      const getRequest = store.get(post_id)

      getRequest.onsuccess = (event) => {
        const post = event.target.result
        if (post) {
          // ステータスを更新
          post.post_status = status

          // 更新した投稿を保存
          const updateRequest = store.put(post)

          updateRequest.onsuccess = () => {
            console.log(`投稿ID ${post_id} のステータスを ${status} に更新しました`)
            resolve(true)
          }

          updateRequest.onerror = (event) => {
            const error = event.target.error
            reject(`投稿の更新に失敗しました: ${error?.message || "Unknown error"}`)
          }
        } else {
          reject(`post_id ${post_id} の投稿が見つかりませんでした`)
        }
      }

      getRequest.onerror = (event) => {
        const error = event.target.error
        reject(`投稿の取得に失敗しました: ${error?.message || "Unknown error"}`)
      }
    })
  } catch (error) {
    console.error("投稿の更新中にエラーが発生しました:", error)
    throw error
  }
}

// すべての投稿を取得（削除されていないもののみ、ステータスでフィルタリング可能）
export const getAllPosts = async (status = null) => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = (event) => {
        let posts = event.target.result

        // 削除されていない投稿のみをフィルタリング
        posts = posts.filter((post) => !post.delete_flag)

        // ステータスが指定されている場合はフィルタリング
        if (status !== null) {
          posts = posts.filter((post) => post.post_status === status)
        }

        // 作成日時の降順でソート（新しいものが先頭）
        posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        console.log(`投稿取得成功: ${posts.length}件`)
        resolve(posts)
      }

      request.onerror = (event) => {
        const error = event.target.error
        reject(`投稿の取得に失敗しました: ${error?.message || "Unknown error"}`)
      }
    })
  } catch (error) {
    console.error("投稿の取得中にエラーが発生しました:", error)
    throw error
  }
}

// 投稿を論理削除（delete_flagを1に設定）
export const deletePost = async (post_id) => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)

      // まず投稿を取得
      const getRequest = store.get(post_id)

      getRequest.onsuccess = (event) => {
        const post = event.target.result
        if (post) {
          // 論理削除フラグを設定
          post.delete_flag = 1
          post.deleted_at = new Date().toISOString() // ISO文字列形式で統一

          // 更新した投稿を保存
          const updateRequest = store.put(post)

          updateRequest.onsuccess = () => {
            console.log(`投稿ID ${post_id} を削除しました`)
            resolve(true)
          }

          updateRequest.onerror = (event) => {
            const error = event.target.error
            reject(`投稿の削除に失敗しました: ${error?.message || "Unknown error"}`)
          }
        } else {
          reject(`post_id ${post_id} の投稿が見つかりませんでした`)
        }
      }

      getRequest.onerror = (event) => {
        const error = event.target.error
        reject(`投稿の取得に失敗しました: ${error?.message || "Unknown error"}`)
      }
    })
  } catch (error) {
    console.error("投稿の削除中にエラーが発生しました:", error)
    throw error
  }
}

// 特定の投稿を取得
export const getPostById = async (post_id) => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(post_id)

      request.onsuccess = (event) => {
        const post = event.target.result
        if (post && !post.delete_flag) {
          resolve(post)
        } else {
          resolve(null)
        }
      }

      request.onerror = (event) => {
        const error = event.target.error
        reject(`投稿の取得に失敗しました: ${error?.message || "Unknown error"}`)
      }
    })
  } catch (error) {
    console.error("投稿の取得中にエラーが発生しました:", error)
    throw error
  }
}

// 予約投稿の一覧を取得（投稿日時でソート）
export const getScheduledPosts = async () => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = (event) => {
        let posts = event.target.result

        // 削除されておらず、予約投稿のもののみをフィルタリング
        posts = posts.filter(
          (post) => !post.delete_flag && post.post_date && post.post_status === "PENDING" && post.network_flag === 0, // 日時指定投稿
        )

        // 投稿日時の昇順でソート（早いものが先頭）
        posts.sort((a, b) => {
          if (!a.post_date || !b.post_date) return 0
          return new Date(a.post_date).getTime() - new Date(b.post_date).getTime()
        })

        console.log(`予約投稿取得成功: ${posts.length}件`)
        resolve(posts)
      }

      request.onerror = (event) => {
        const error = event.target.error
        reject(`予約投稿の取得に失敗しました: ${error?.message || "Unknown error"}`)
      }
    })
  } catch (error) {
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
export const updatePostImageAndStatus = async (postId, imageUrl, status) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const getRequest = store.get(postId);

      getRequest.onsuccess = (event) => {
        const post = event.target.result;
        if (post) {
          post.image_url = imageUrl;
          post.post_status = status;
          post.updated_at = new Date().toISOString();

          const updateRequest = store.put(post);
          updateRequest.onsuccess = () => {
            console.log(`投稿ID ${postId} の画像URLとステータスを更新しました`);
            resolve(post);
          };
          updateRequest.onerror = (error) => {
            reject(`投稿の更新に失敗しました: ${error.target.error}`);
          };
        } else {
          reject(`投稿ID ${postId} が見つかりません`);
        }
      };

      getRequest.onerror = (error) => {
        reject(`投稿の取得に失敗しました: ${error.target.error}`);
      };
    });
  } catch (error) {
    console.error("投稿の更新中にエラーが発生しました:", error);
    throw error;
  }
};
