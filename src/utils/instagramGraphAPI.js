// Instagram API設定
const instaBusinessId = process.env.NEXT_PUBLIC_INSTAGRAM_BUSINESS_ID || "17841474504264978"
const accessToken = process.env.NEXT_PUBLIC_INSTAGRAM_ACCESS_TOKEN || "EAAbDJRdi8q8BO7s2ZAKanA7nZCqIMH2HH5wp71ys4qIbUngZBsr4X2gpVKxR0qnFmMcgEz8kMhOE4d6dTZAJNyh1butHvG3AXNICkWfQKX7PpKco3wWZBxkmigFJBzCHEDR5XJWihbQqgfxIGqWp6lOGSUaonyGw64lYPf62hXASk1JpH3MkEi10pif2UBaHK36bA"

/**
 * コンテナIDを取得する関数
 * @param {string} imageUrl - 画像のURL
 * @param {string} caption - 投稿のキャプション
 * @returns {Promise<Object|null>} - コンテナIDを含むレスポンスまたはnull
 */
export async function makeContainerAPI(image_url,caption) {
    const postData = {
        image_url: image_url, // 画像の場合変数がimage_url、動画の場合はvideo_urlにする
        caption: caption, // ここに投稿したい文章を挿入
        access_token: accessToken, // アクセストークンを追加
    }

    const url = `https://graph.facebook.com/v17.0/${instaBusinessId}/media`

    try {
        console.log("Instagram API リクエスト開始:", {
            url,
            data: {
                ...postData,
                access_token: "***隠されています***", // トークンは隠す
            },
        })

    const response = await instagramApi(url, "POST", postData)

    if (response) {
        console.log("Instagram API レスポンス:", response)
        return response
        } else {
            console.error("Instagram APIのリクエストでエラーが発生しました。")
            return null
        }
    } catch (error) {
        console.error("Instagram APIのレスポンスの解析中にエラーが発生しました:", error)
        return null
    }
    }

/**
 * 投稿を公開する関数
 * @param {string} containerId - コンテナID
 * @returns {Promise<Object|null>} - 公開結果またはnull
 */
export async function publishPost(containerId) {
    const postData = {
        creation_id: containerId,
        access_token: accessToken,
    }

    const url = `https://graph.facebook.com/v17.0/${instaBusinessId}/media_publish`

    try {
        console.log("Instagram 投稿公開リクエスト開始:", {
            url,
            data: {
                creation_id: containerId,
                access_token: "***隠されています***",
            },
        })

        const response = await instagramApi(url, "POST", postData)

        if (response) {
            console.log("Instagram 投稿公開レスポンス:", response)
            return response
        } else {
            console.error("Instagram 投稿公開でエラーが発生しました。")
            return null
        }
    } catch (error) {
        console.error("Instagram 投稿公開中にエラーが発生しました:", error)
        return null
    }
}

/**
 * APIを叩く関数
 * @param {string} url - APIのURL
 * @param {string} method - HTTPメソッド（GET、POSTなど）
 * @param {Object} postData - 送信するデータ
 * @returns {Promise<Object|null>} - APIレスポンスまたはnull
 */
export async function instagramApi(url, method, postData) {
    try {
        const options = {
            method: method,
            headers: {
                "Content-Type": "application/json",
            },
        }

        // POSTの場合のみbodyを追加
        if (method === "POST" && postData) {
            options.body = JSON.stringify(postData)
        }

        console.log("fetch リクエスト:", {
            url,
            method,
            headers: options.headers,
            hasBody: !!options.body,
        })

        const response = await fetch(url, options)

        if (!response.ok) {
            const errorText = await response.text()
            console.error("Instagram API エラー:", {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText,
            })
            throw new Error(`Instagram API エラー: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error("Instagram APIのリクエスト中にエラーが発生しました:", error)
        return null
    }
}

/**
 * 完全な投稿プロセス（コンテナ作成 → 公開）
 * @param {string} image_url - 画像のURL
 * @param {string} caption - 投稿のキャプション
 * @returns {Promise<Object>} - 投稿結果
 */
export async function postToInstagram(image_url, caption) {
    try {
        console.log("Instagram投稿プロセス開始...")

        // 1. コンテナを作成
        console.log("ステップ1: コンテナ作成中...")
        const containerResponse = await makeContainerAPI(image_url, caption)

        if (!containerResponse || !containerResponse.id) {
            throw new Error("コンテナの作成に失敗しました")
        }

        const containerId = containerResponse.id
        console.log("コンテナ作成成功:", containerId)

        // 2. 投稿を公開
        console.log("ステップ2: 投稿公開中...")
        const publishResponse = await publishPost(containerId)

        if (!publishResponse || !publishResponse.id) {
            throw new Error("投稿の公開に失敗しました")
        }

        console.log("投稿公開成功:", publishResponse.id)

        return {
        success: true,
        containerId: containerId,
        postId: publishResponse.id,
        message: "投稿が正常に完了しました",
        }
    } catch (error) {
        console.error("Instagram投稿プロセスでエラーが発生しました:", error)
        return {
        success: false,
        error: error.message,
        message: "投稿に失敗しました",
        }
    }
}

/**
 * テスト用の投稿関数
 * @returns {Promise<Object>} - テスト結果
 */
export async function testInstagramPost(postData) {
    console.log("Instagram API テスト開始...")

    const testImageUrl = "https://picsum.photos/800/600"
    const testCaption = "テスト投稿 #test #instagram"

    const result = await postToInstagram(testImageUrl, testCaption)

    console.log("テスト結果:", result)
    return result
}
