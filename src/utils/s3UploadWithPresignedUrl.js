import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  }
});

const BUCKET_NAME = process.env.REACT_APP_AWS_S3_BUCKET_NAME;

/**
 * 署名付きURLを使用してBase64画像データをS3にアップロード
 * @param {string} base64Data - Base64形式の画像データ
 * @param {string} postId - 投稿ID（ファイル名の一部として使用）
 * @returns {Promise<string>} - S3の公開URL
 */
export async function uploadImageToS3WithPresignedUrl(base64Data, postId) {
  try {
    // ユニークなファイル名を生成
    const fileName = `temp/${postId}-${Date.now()}.jpg`;
    
    // 署名付きURLを生成
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      ContentType: 'image/jpeg'
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Base64データをBlobに変換
    const response = await fetch(base64Data);
    const blob = await response.blob();
    
    // 署名付きURLを使用してアップロード
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': 'image/jpeg'
      }
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }
    
    // 公開URLを生成
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${fileName}`;
    
    console.log('S3アップロード成功（署名付きURL使用）:', publicUrl);
    return publicUrl;
    
  } catch (error) {
    console.error('S3アップロードエラー:', error);
    throw new Error(`S3アップロードに失敗しました: ${error.message}`);
  }
} 