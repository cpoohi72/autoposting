// IndexedDBのデータベース名とバージョン
const DB_NAME = "offlinePostsDB"
const DB_VERSION = 2 // バージョンを上げてスキーマ更新
const STORE_NAME = "posts"

// 投稿ステータスの定義
export const POST_STATUS = {
  PENDING: "PENDING", // 投稿待ち
  POSTED: "POSTED", // 投稿済み
  FAILED: "FAILED", // 投稿失敗
}

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
      const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "post_id", autoIncrement: true })

      // インデックスを作成（検索を高速化するため）
      objectStore.createIndex("post_date", "post_date", { unique: false })
      objectStore.createIndex("post_status", "post_status", { unique: false })
      objectStore.createIndex("network_flag", "network_flag", { unique: false })
      objectStore.createIndex("created_at", "created_at", { unique: false })
      objectStore.createIndex("delete_flg", "delete_flg", { unique: false })
    }

    request.onsuccess = (event) => {
      const db = event.target.result
      resolve(db)
    }

    request.onerror = (event) => {
      reject(`データベースを開けませんでした: ${event.target.errorCode}`)
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

      // 現在のタイムスタンプを取得
      const now = new Date()

      // データベース設計に合わせた投稿データを作成
      const post = {
        // post_id は autoIncrement なので指定しない
        image_url: postData.image, // Base64画像データ
        caption: postData.caption || "", // 投稿の文章
        post_date: postData.scheduledDateTime ? new Date(postData.scheduledDateTime) : null, // 投稿予約時間
        network_flag: postData.postingOption === "whenConnected", // ネット接続時に投稿かどうか
        post_status: POST_STATUS.PENDING, // 投稿の状態
        post_url: null, // 投稿後のInstagram投稿URL（初期はnull）
        delete_flg: false, // 削除フラグ（デフォルトはfalse）
        created_at: now, // 作成日時
        updated_at: now, // 更新日時
        deleted_at: null, // 削除日時（初期はnull）
      }

      const request = store.add(post)

      request.onsuccess = (event) => {
        resolve(event.target.result) // 生成されたpost_idを返す
      }

      request.onerror = (event) => {
        reject(`投稿の保存に失敗しました: ${event.target.errorCode}`)
      }
    })
  } catch (error) {
    console.error("投稿の保存中にエラーが発生しました:", error)
    throw error
  }
}

// 投稿のステータスを更新
export const updatePostStatus = async (post_id, status, post_url = null) => {
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
          // ステータスと更新日時を更新
          post.post_status = status
          post.updated_at = new Date()

          // 投稿URLがある場合は設定
          if (post_url) {
            post.post_url = post_url
          }

          // 更新した投稿を保存
          const updateRequest = store.put(post)

          updateRequest.onsuccess = () => {
            resolve(true)
          }

          updateRequest.onerror = (event) => {
            reject(`投稿の更新に失敗しました: ${event.target.errorCode}`)
          }
        } else {
          reject(`post_id ${post_id} の投稿が見つかりませんでした`)
        }
      }

      getRequest.onerror = (event) => {
        reject(`投稿の取得に失敗しました: ${event.target.errorCode}`)
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
        posts = posts.filter((post) => !post.delete_flg)

        // ステータスが指定されている場合はフィルタリング
        if (status !== null) {
          posts = posts.filter((post) => post.post_status === status)
        }

        // 作成日時の降順でソート（新しいものが先頭）
        posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

        resolve(posts)
      }

      request.onerror = (event) => {
        reject(`投稿の取得に失敗しました: ${event.target.errorCode}`)
      }
    })
  } catch (error) {
    console.error("投稿の取得中にエラーが発生しました:", error)
    throw error
  }
}

// 投稿を論理削除（delete_flgをtrueに設定）
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
          post.delete_flg = true
          post.deleted_at = new Date()
          post.updated_at = new Date()

          // 更新した投稿を保存
          const updateRequest = store.put(post)

          updateRequest.onsuccess = () => {
            resolve(true)
          }

          updateRequest.onerror = (event) => {
            reject(`投稿の削除に失敗しました: ${event.target.errorCode}`)
          }
        } else {
          reject(`post_id ${post_id} の投稿が見つかりませんでした`)
        }
      }

      getRequest.onerror = (event) => {
        reject(`投稿の取得に失敗しました: ${event.target.errorCode}`)
      }
    })
  } catch (error) {
    console.error("投稿の削除中にエラーが発生しました:", error)
    throw error
  }
}

// 物理削除（完全にデータを削除）
export const hardDeletePost = async (post_id) => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(post_id)

      request.onsuccess = () => {
        resolve(true)
      }

      request.onerror = (event) => {
        reject(`投稿の物理削除に失敗しました: ${event.target.errorCode}`)
      }
    })
  } catch (error) {
    console.error("投稿の物理削除中にエラーが発生しました:", error)
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
        if (post && !post.delete_flg) {
          resolve(post)
        } else {
          resolve(null)
        }
      }

      request.onerror = (event) => {
        reject(`投稿の取得に失敗しました: ${event.target.errorCode}`)
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
        posts = posts.filter((post) => !post.delete_flg && post.post_date && post.post_status === POST_STATUS.PENDING)

        // 投稿日時の昇順でソート（早いものが先頭）
        posts.sort((a, b) => new Date(a.post_date) - new Date(b.post_date))

        resolve(posts)
      }

      request.onerror = (event) => {
        reject(`予約投稿の取得に失敗しました: ${event.target.errorCode}`)
      }
    })
  } catch (error) {
    console.error("予約投稿の取得中にエラーが発生しました:", error)
    throw error
  }
}
