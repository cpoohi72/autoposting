import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  }
});

const BUCKET_NAME = process.env.REACT_APP_AWS_S3_BUCKET_NAME;

/**
 * Base64画像データをS3にアップロードし、公開URLを返す
 * @param {string} base64Data - Base64形式の画像データ
 * @param {string} postId - 投稿ID（ファイル名の一部として使用）
 * @returns {Promise<string>} - S3の公開URL
 */
export async function uploadImageToS3(base64Data, postId) {
  try {
    // Base64データをBlobに変換
    const response = await fetch(base64Data);
    const blob = await response.blob();
    
    // BlobをArrayBufferに変換してからUint8Arrayに
    const arrayBuffer = await blob.arrayBuffer();
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

    await s3Client.send(command);
    
    // 公開URLを生成
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${fileName}`;
    
    console.log('S3アップロード成功:', publicUrl);
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
export async function deleteFileFromS3(fileUrl) {
  try {
    // URLからファイルキーを抽出
    const url = new URL(fileUrl);
    const fileName = url.pathname.substring(1); // 先頭の '/' を削除

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName
    });

    await s3Client.send(command);
    console.log('S3ファイル削除成功:', fileName);

  } catch (error) {
    console.error('S3ファイル削除エラー:', error);
  }
}
