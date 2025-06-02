"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfilePictureUrl = exports.getPostImageUrl = exports.hasAccessToPostImage = exports.generatePostPictureKey = exports.generateProfilePictureKey = exports.getPublicUrl = exports.generateDownloadUrl = exports.generateUploadUrl = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const S3_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'twitter-clone-bucket';
const EXPIRES_IN = 3600;
const s3Client = new client_s3_1.S3Client({
    region: S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-access-key-id',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-secret-access-key'
    }
});
const generateUploadUrl = async (key, contentType) => {
    const command = new client_s3_1.PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: contentType
    });
    return await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: EXPIRES_IN });
};
exports.generateUploadUrl = generateUploadUrl;
const generateDownloadUrl = async (key) => {
    const command = new client_s3_1.GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key
    });
    return await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: EXPIRES_IN });
};
exports.generateDownloadUrl = generateDownloadUrl;
const getPublicUrl = (key) => {
    return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
};
exports.getPublicUrl = getPublicUrl;
const generateProfilePictureKey = (userId, fileExt) => {
    return `profile-pictures/${userId}/profile${fileExt}`;
};
exports.generateProfilePictureKey = generateProfilePictureKey;
const generatePostPictureKey = (postId, index, fileExt) => {
    return `posts/${postId}/${index}${fileExt}`;
};
exports.generatePostPictureKey = generatePostPictureKey;
const hasAccessToPostImage = (viewerId, authorId, isPrivate, isFollowing) => {
    if (viewerId === authorId)
        return true;
    if (isPrivate)
        return isFollowing;
    return true;
};
exports.hasAccessToPostImage = hasAccessToPostImage;
const getPostImageUrl = async (key, viewerId, authorId, isPrivate, isFollowing) => {
    if ((0, exports.hasAccessToPostImage)(viewerId, authorId, isPrivate, isFollowing)) {
        return await (0, exports.generateDownloadUrl)(key);
    }
    return null;
};
exports.getPostImageUrl = getPostImageUrl;
const getProfilePictureUrl = (key) => {
    return (0, exports.getPublicUrl)(key);
};
exports.getProfilePictureUrl = getProfilePictureUrl;
//# sourceMappingURL=s3.js.map