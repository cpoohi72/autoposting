//s3へ画像をアップロードする関数(s3Upload.jsのuploadImageToS3関数)
import { uploadImageToS3 } from './s3Upload';
//投稿のステータスを更新する関数(indexedDB.jsのupdatePostImageAndStatus関数)
import { updatePostImageAndStatus } from './indexedDB';

// Instagram API設定(環境変数から取得)
const instaBusinessId = process.env.REACT_APP_INSTAGRAM_BUSINESS_ID
const accessToken = process.env.REACT_APP_INSTAGRAM_ACCESS_TOKEN

/**
 * コンテナIDを取得する関数
 * @param {string} imageUrl - 画像のURL
 * @param {string} caption - 投稿のキャプション
 * @returns {Promise<Object|null>} - コンテナIDを含むレスポンスまたはnull
 */
//asyncは非同期処理を行うためのキーワード(非同期処理をするための宣言的なもの)
//awaitは非同期処理が終わるまで待つ
//image_urlは画像のURL
//captionは投稿のキャプション
export async function makeContainerAPI(image_url,caption) {
    //postData変数に引数で渡された情報、インスタAPIのアクセストークンを格納
    const postData = {
        image_url: image_url,
        caption: caption,
        access_token: accessToken,
    }

    //インスタAPIのURL
    const url = `https://graph.facebook.com/v17.0/${instaBusinessId}/media`

    try {
        console.log("Instagram API リクエスト開始:", {
            //postDataの情報をコンソールに出力
            url,
            data: {
                ...postData,
                //アクセストークンは隠す
                access_token: "***隠されています***", 
            },
        })

        //instagramApi関数を呼び出し、apiのurl,HTTPメソッド名、postDataの情報を渡す
        //API通信の結果をresponseに格納。コンテナIDを取得するために使用。
        const response = await instagramApi(url, "POST", postData)

        //responseがある場合
        if (response) {
            //コンソールにレスポンスを出力
            console.log("Instagram API レスポンス:", response)
            //responseを返す
            return response
        } else {
            //コンソールにエラーを出力
            console.error("Instagram APIのリクエストでエラーが発生しました。")
            return null
        }
    } catch (error) {
        //コンソールにエラーを出力
        console.error("Instagram APIのレスポンスの解析中にエラーが発生しました:", error)
        return null
    }
    }

/**
 * 投稿を公開する関数
 * @param {string} containerId - コンテナID
 * @returns {Promise<Object|null>} - 公開結果またはnull
 */
//asyncは非同期処理を行うためのキーワード(非同期処理をするための宣言的なもの)
//awaitは非同期処理が終わるまで待つ
//コンテナIDを引数として渡す
export async function publishPost(containerId) {
    //postData変数に引数で渡された情報、インスタAPIのアクセストークンを格納
    const postData = {
        creation_id: containerId,
        access_token: accessToken,
    }

    //インスタAPIのURL
    const url = `https://graph.facebook.com/v17.0/${instaBusinessId}/media_publish`

    try {
        console.log("Instagram 投稿公開リクエスト開始:", {
            //urlを出力
            url,
            //postDataの情報をコンソールに出力
            data: {
                //コンテナIDを出力
                creation_id: containerId,
                //アクセストークンは隠す
                access_token: "***隠されています***",
            },
        })

        //instagramApi関数を呼び出し、apiのurl,HTTPメソッド名、postDataの情報を渡す
        //API通信の結果をresponseに格納。
        const response = await instagramApi(url, "POST", postData)

        //responseがある場合
        if (response) {
            //コンソールにレスポンスを出力
            console.log("Instagram 投稿公開レスポンス:", response)
            //responseを返す
            return response
        } else {
            //コンソールにエラーを出力
            console.error("Instagram 投稿公開でエラーが発生しました。")
            return null
        }
    } catch (error) {
        //コンソールにエラーを出力
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
//asyncは非同期処理を行うためのキーワード(非同期処理をするための宣言的なもの)
//awaitは非同期処理が終わるまで待つ
//urlはAPIのURL
//methodはHTTPメソッド(GET、POSTなど)
//postDataは送信するデータ
export async function instagramApi(url, method, postData) {
    try {
        //option変数にHTTPメソッドとヘッダーを格納
        const options = {
            //HTTPメソッドを格納
            method: method,
            //ヘッダーを格納
            headers: {
                //Content-TypeはJSON形式で送信することを宣言
                "Content-Type": "application/json",
            },
        }

        // POSTの場合のみbodyを追加
        if (method === "POST" && postData) {
            //bodyにpostDataをJSON形式で格納
            options.body = JSON.stringify(postData)
        }

        //コンソールにリクエストの情報を出力
        console.log("fetch リクエスト:", {
            //urlを出力
            url,
            //HTTPメソッドを出力
            method,
            //ヘッダーを出力
            headers: options.headers,
            //bodyがあるかどうかを出力
            hasBody: !!options.body,
        })

        //fetch関数を呼び出し、urlとoptionを渡す
        //fetch関数はサーバと通信を行う関数。これでAPIと通信を行う。
        //awaitは非同期処理が終わるまで待つ
        //コンテナIDや投稿公開後のレスポンスがここで取得される。
        const response = await fetch(url, options)

        //レスポンスが正常でない場合
        if (!response.ok) {
            //レスポンスのテキストを取得
            const errorText = await response.text()
            //コンソールにエラーを出力
            console.error("Instagram API エラー:", {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText,
            })
            //エラーを出力
            throw new Error(`Instagram API エラー: ${response.status} ${response.statusText}`)
        }

        //レスポンスの結果をJSON形式で取得
        const data = await response.json()
        //dataを返す
        return data
    } catch (error) {
        //エラーを出力
        console.error("Instagram APIのリクエスト中にエラーが発生しました:", error)
        return null
    }
}

/**
 * 投稿処理（S3アップロード → Instagram投稿）
 * @param {Object} postData - 投稿データ（IndexedDBから取得）
 * @returns {Promise<Object>} - 投稿結果
 */
//投稿の処理を行う関数
//S3、indexedDBに保存する処理を行う
//postDataは投稿データ(IndexedDBから取得)
//外部からメインで呼び出される関数
export async function processInstagramPost(postData) {
    try {
        //コンソールに投稿データのIDを出力
        console.log("Instagram投稿処理開始...", postData.post_id);

        // ステータスを「処理中」に更新(indexedDB.jsのupdatePostImageAndStatus関数)
        //PROCESSINGは投稿のステータス
        await updatePostImageAndStatus(postData.post_id, postData.image_url, "PROCESSING");

        let imageUrl = postData.image_url;
        // 画像がBase64データの場合、S3にアップロード(s3Upload.jsのuploadImageToS3関数)
        //URLがdata:image/から始まる場合S3にアップロードする
        if (postData.image_url.startsWith('data:image/')) {
            console.log("S3に画像をアップロード中...");
            //S3にアップロードする(画像のURLが戻り値として返ってくる)
            imageUrl = await uploadImageToS3(postData.image_url, postData.post_id);

            // IndexedDBのimage_urlを更新(indexedDB.jsのupdatePostImageAndStatus関数)
            //UPLOADINGは投稿のステータス
            await updatePostImageAndStatus(postData.post_id, imageUrl, "UPLOADING");
            console.log("S3アップロード完了、IndexedDB更新済み");
        }

        // Instagramコンテナを作成(makeContainerAPI関数)
        console.log("Instagramコンテナ作成中...");
        //makeContainerAPI関数を呼び出し、imageUrlとcaptionを渡す
        const containerResponse = await makeContainerAPI(imageUrl, postData.caption);

        //containerResponseがない場合
        if (!containerResponse || !containerResponse.id) {
            throw new Error("コンテナの作成に失敗しました");
        }

        //コンテナ作成後のレスポンスのidをcontainerIdに格納
        const containerId = containerResponse.id;
        console.log("コンテナ作成成功:", containerId);

        // 投稿を公開(publishPost関数)
        console.log("投稿公開中...");
        //publishPost関数を呼び出し、containerIdを渡す
        //投稿公開後のレスポンスをpublishResponseに格納
        const publishResponse = await publishPost(containerId);

        //publishResponseがない場合
        if (!publishResponse || !publishResponse.id) {
            throw new Error("投稿の公開に失敗しました");
        }

        //publishResponseのidをinstagramPostIdに格納
        console.log("投稿公開成功:", publishResponse.id);

        // ステータスを「完了」に更新(indexedDB.jsのupdatePostImageAndStatus関数)
        //POSTEDは投稿のステータス
        await updatePostImageAndStatus(postData.post_id, imageUrl, "POSTED");

        //投稿が正常に完了した場合
        return {
            success: true,
            postId: postData.post_id,
            instagramPostId: publishResponse.id,
            imageUrl: imageUrl,
            message: "投稿が正常に完了しました",
        };
    } catch (error) {
        //コンソールにエラーを出力
        console.error("Instagram投稿処理でエラーが発生しました:", error);

        // エラー時はステータスを「失敗」に更新(indexedDB.jsのupdatePostImageAndStatus関数)
        //FAILEDは投稿のステータス
        try {
            await updatePostImageAndStatus(postData.post_id, postData.image_url, "FAILED");
        } catch (updateError) {
            //コンソールにエラーを出力
            console.error("ステータス更新でエラーが発生しました:", updateError);
        }

        //投稿が正常に完了しなかった場合
        return {
            success: false,
            postId: postData.post_id,
            error: error.message,
            message: "投稿に失敗しました",
        };
    }
}