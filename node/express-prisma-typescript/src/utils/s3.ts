import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// S3 configuration - should come from environment variables in production
const S3_REGION = process.env.AWS_REGION || 'us-east-1'
const S3_BUCKET = process.env.S3_BUCKET || 'twitter-clone-bucket'
const EXPIRES_IN = 3600 // URL expiration time in seconds (1 hour)

// Initialize S3 client
const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-access-key-id',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-secret-access-key'
  }
})

/**
 * Generate a pre-signed URL for uploading an object to S3
 * @param key The object key in S3 (file path)
 * @param contentType The content type of the file (e.g., 'image/jpeg')
 * @returns A pre-signed URL that can be used to upload the file directly to S3
 */
export const generateUploadUrl = async (key: string, contentType: string): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType
  })

  return await getSignedUrl(s3Client, command, { expiresIn: EXPIRES_IN })
}

/**
 * Generate a pre-signed URL for downloading an object from S3
 * @param key The object key in S3 (file path)
 * @returns A pre-signed URL that can be used to download the file
 */
export const generateDownloadUrl = async (key: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  })

  return await getSignedUrl(s3Client, command, { expiresIn: EXPIRES_IN })
}

/**
 * Generate a public URL for an object in S3
 * @param key The object key in S3 (file path)
 * @returns The public URL of the object
 */
export const getPublicUrl = (key: string): string => {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`
}

/**
 * Generate a unique key for a user profile picture
 * @param userId The user ID
 * @param fileExt The file extension (e.g., '.jpg', '.png')
 * @returns A unique key for the user's profile picture
 */
export const generateProfilePictureKey = (userId: string, fileExt: string): string => {
  return `users/${userId}/profile${fileExt}`
}

/**
 * Generate a unique key for a post picture
 * @param postId The post ID
 * @param index The index of the picture in the post
 * @param fileExt The file extension (e.g., '.jpg', '.png')
 * @returns A unique key for the post picture
 */
export const generatePostPictureKey = (postId: string, index: number, fileExt: string): string => {
  return `posts/${postId}/${index}${fileExt}`
} 