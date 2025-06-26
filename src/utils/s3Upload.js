// AWSのS3クライアント(S3を使うためのもの)をインポート
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// S3クライアントを作成
const s3Client = new S3Client({
  //AWSのリージョン
  region: process.env.REACT_APP_AWS_REGION,
  //AWSのアクセスキー
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  }
});

//S3のバケット名
const BUCKET_NAME = process.env.REACT_APP_AWS_S3_BUCKET_NAME;

/**
 * Base64画像データをS3にアップロードし、公開URLを返す
 * @param {string} base64Data - Base64形式の画像データ
 * @param {string} postId - 投稿ID（ファイル名の一部として使用）
 * @returns {Promise<string>} - S3の公開URL
 */
//Base64形式の画像データと投稿IDを引数として渡す
//instagramGraphAPI.jsから呼び出される
export async function uploadImageToS3(base64Data, postId) {
  try {
    // Base64データをBlobに変換(データをバイナリデータに変換する)
    const response = await fetch(base64Data);
    //結果からBlobを取得
    const blob = await response.blob();
    
    // BlobをArrayBuffer(バイナリデータを格納するためのJavaScriptのオブジェクト)に変換してからUint8Arrayに変換
    const arrayBuffer = await blob.arrayBuffer();
    //8ビット符号なし整数の配列としてarrayBufferを変換する
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // ユニークなファイル名を生成（postIdを含む）
    const fileName = `temp/${postId}-${Date.now()}.jpg`;
    
    // S3にアップロード
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: uint8Array,
      ContentType: 'image/jpeg'
    });

    //S3クライアントにコマンドを送信
    await s3Client.send(command);
    
    // 公開URLを生成
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${fileName}`;
    
    console.log('S3アップロード成功:', publicUrl);
    //公開URLを返す
    return publicUrl;
    
  } catch (error) {
    console.error('S3アップロードエラー:', error);
    throw new Error(`S3アップロードに失敗しました: ${error.message}`);
  }
}

/**
 * S3からファイルを削除
 * @param {string} fileUrl - 削除するファイルのURL
 */
//***********使われてないかも***********
//S3からファイルを削除する関数
//fileUrlは削除するファイルのURL
export async function deleteFileFromS3(fileUrl) {
  try {
    // URLからファイルキーを抽出
    const url = new URL(fileUrl);
    //先頭の '/' を削除
    const fileName = url.pathname.substring(1);

    //S3クライアントにコマンドを送信
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName
    });

    //S3クライアントにコマンドを送信
    await s3Client.send(command);
    //コンソールにログを出力
    console.log('S3ファイル削除成功:', fileName);

  } catch (error) {
    //コンソールにエラーを出力
    console.error('S3ファイル削除エラー:', error);
  }
}
