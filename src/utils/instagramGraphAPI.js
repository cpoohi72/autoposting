/**
 * Instagram APIを使用してコンテナIDを取得する関数
 * @param {string} image_url - 画像のURL
 * @param {string} caption - 投稿のキャプション
 * @param {string} businessId - InstagramビジネスアカウントID
 * @param {string} accessToken - アクセストークン
 * @param {string} mediaType - メディアタイプ（空、REELS、STORIESなど）
 * @returns {Promise<Object>} - コンテナIDを含むレスポンス
 */
export async function makeContainerAPI(image_url,caption) {
  try {
    const postData = {
      image_url, // 画像の場合変数がimage_url、動画の場合はvideo_urlにする
      caption, // ここに投稿したい文章を挿入
    //   media_type: mediaType, // 画像だけの投稿なら空、動画だけの投稿なら値をREELS、ストーリーなら値をSTORIESにする
      access_token: "EAAbDJRdi8q8BOZCFE2sRjtt0IV9o0hYPy0sWUWJIDeBVOiu0MQmzDOru5haBrtG6X6PwXhdMgJnZBnVljuDxh2zN6Rn4ZAs9B2rCOBjSZBp08a75xFXWlGcNgLJPFcYaRFEc3mFXAbH8cCpn5pCXogGPLm1QFbCLZBJ3J2QXCEWUPTUrjI8JDgrZC2DpI5QiMOhK7ZB",
    }

    const url = `https://graph.facebook.com/v18.0/${businessId}/media`

    console.log("Instagram API リクエスト:", {
      url,
      data: {
        ...postData,
        access_token:"" // トークンは隠す
      },
    })

    const response = await instagramApi(url, "POST", postData)
    return response
  } catch (error) {
    console.error("Instagram APIのリクエスト中にエラーが発生しました:", error)
    return null
  }
}

/**
 * Instagram APIにリクエストを送信する関数
 * @param {string} url - APIのURL
 * @param {string} method - HTTPメソッド（GET、POSTなど）
 * @param {Object} postData - 送信するデータ
 * @returns {Promise<Object>} - APIレスポンス
 */
export async function instagramApi(url, method, postData) {
  try {
    const options = {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Instagram API エラー: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    console.log("Instagram API レスポンス:", data)
    return data
  } catch (error) {
    console.error("Instagram APIのリクエスト中にエラーが発生しました:", error)
    throw error
  }
}
