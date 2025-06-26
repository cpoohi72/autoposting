//************ ファイル自体使われてないかも ************
//S3のクライアントをインポート
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
//署名付きURLを生成するための関数をインポート
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

//S3のクライアントを作成
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
 * 署名付きURLを使用してBase64画像データをS3にアップロード
 * @param {string} base64Data - Base64形式の画像データ
 * @param {string} postId - 投稿ID（ファイル名の一部として使用）
 * @returns {Promise<string>} - S3の公開URL
 */
//Base64形式の画像データと投稿IDを引数として渡す
export async function uploadImageToS3WithPresignedUrl(base64Data, postId) {
  try {
    // ユニークなファイル名を生成
    const fileName = `temp/${postId}-${Date.now()}.jpg`;
    
    // 署名付きURLを生成
    const command = new PutObjectCommand({
      //S3のバケット名
      Bucket: BUCKET_NAME,
      //ファイル名
      Key: fileName,
      //ファイルのコンテンツタイプ
      ContentType: 'image/jpeg'
    });
    
    //署名付きURLを生成
    //s3ClientはS3のクライアント
    //commandはS3のコマンド
    //{ expiresIn: 3600 }はURLの有効期限(3600秒)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Base64データをBlobに変換(データをバイナリデータに変換する)
    const response = await fetch(base64Data);
    //結果からBlobを取得
    const blob = await response.blob();
    
    //署名付きURLを使用してアップロード
    //presignedUrlは署名付きURL
    const uploadResponse = await fetch(presignedUrl, {
      //PUTはファイルをアップロードするためのメソッド
      method: 'PUT',
      //bodyはファイルのデータ
      body: blob,
      //headersはファイルのヘッダー
      headers: {
        'Content-Type': 'image/jpeg'
      }
    });
    
    //uploadResponseがokでない場合(アップロードに失敗した場合)
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }
    
    // 公開URLを生成
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${fileName}`;
    
    //コンソールにログを出力
    console.log('S3アップロード成功（署名付きURL使用）:', publicUrl);
    return publicUrl;
    
  } catch (error) {
    //コンソールにエラーを出力
    console.error('S3アップロードエラー:', error);
    throw new Error(`S3アップロードに失敗しました: ${error.message}`);
  }
} 