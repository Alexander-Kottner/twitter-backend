"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRouter = void 0;
const express_1 = require("express");
const http_status_1 = __importDefault(require("http-status"));
require("express-async-errors");
const _utils_1 = require("../../../utils");
const repository_1 = require("../repository");
const service_1 = require("../service");
const dto_1 = require("../dto");
exports.postRouter = (0, express_1.Router)();
const service = new service_1.PostServiceImpl(new repository_1.PostRepositoryImpl(_utils_1.db));
exports.postRouter.get('/', async (req, res) => {
    const { userId } = res.locals.context;
    const { limit, before, after } = req.query;
    const posts = await service.getLatestPosts(userId, { limit: Number(limit), before, after });
    return res.status(http_status_1.default.OK).json(posts);
});
exports.postRouter.get('/:postId', async (req, res) => {
    const { userId } = res.locals.context;
    const { postId } = req.params;
    const post = await service.getPost(userId, postId);
    return res.status(http_status_1.default.OK).json(post);
});
exports.postRouter.get('/by_user/:userId', async (req, res) => {
    const { userId } = res.locals.context;
    const { userId: authorId } = req.params;
    const posts = await service.getPostsByAuthor(userId, authorId);
    return res.status(http_status_1.default.OK).json(posts);
});
exports.postRouter.post('/', (0, _utils_1.BodyValidation)(dto_1.CreatePostInputDTO), async (req, res) => {
    const { userId } = res.locals.context;
    const data = req.body;
    const post = await service.createPost(userId, data);
    return res.status(http_status_1.default.CREATED).json(post);
});
exports.postRouter.delete('/:postId', async (req, res) => {
    const { userId } = res.locals.context;
    const { postId } = req.params;
    await service.deletePost(userId, postId);
    return res.status(http_status_1.default.OK).send(`Deleted post ${postId}`);
});
exports.postRouter.get('/:postId/comments', async (req, res) => {
    const { userId } = res.locals.context;
    const { postId } = req.params;
    const comments = await service.getCommentsByPostId(userId, postId);
    return res.status(http_status_1.default.OK).json(comments);
});
exports.postRouter.get('/:postId/comments/paginated', async (req, res) => {
    const { userId } = res.locals.context;
    const { postId } = req.params;
    const { limit, before, after } = req.query;
    const comments = await service.getCommentsByPostIdPaginated(userId, postId, {
        limit: limit ? Number(limit) : undefined,
        before,
        after
    });
    return res.status(http_status_1.default.OK).json(comments);
});
exports.postRouter.get('/:postId/with_comments', async (req, res) => {
    const { userId } = res.locals.context;
    const { postId } = req.params;
    const postWithComments = await service.getPostsWithComments(userId, postId);
    return res.status(http_status_1.default.OK).json(postWithComments);
});
exports.postRouter.post('/:postId/comments', (0, _utils_1.BodyValidation)(dto_1.CreatePostInputDTO), async (req, res) => {
    const { userId } = res.locals.context;
    const { postId } = req.params;
    const data = req.body;
    const comment = await service.createComment(userId, postId, data);
    return res.status(http_status_1.default.CREATED).json(comment);
});
exports.postRouter.get('/user/:userId/comments', async (req, res) => {
    const { userId } = res.locals.context;
    const { userId: targetUserId } = req.params;
    const comments = await service.getCommentsByUserId(userId, targetUserId);
    return res.status(http_status_1.default.OK).json(comments);
});
exports.postRouter.get('/:postId/image-upload-url', async (req, res) => {
    const { userId } = res.locals.context;
    const { postId } = req.params;
    const { fileExt, index } = req.query;
    if (!fileExt || index === undefined) {
        return res.status(http_status_1.default.BAD_REQUEST).json({ message: 'File extension and index are required' });
    }
    const { uploadUrl, key } = await service.generatePostImageUploadUrl(userId, postId, fileExt, Number(index));
    return res.status(http_status_1.default.OK).json({ uploadUrl, key });
});
exports.postRouter.get('/:postId/images', async (req, res) => {
    const { userId } = res.locals.context;
    const { postId } = req.params;
    const images = await service.getPostImages(userId, postId);
    return res.status(http_status_1.default.OK).json(images);
});
exports.postRouter.post('/:postId/image', async (req, res) => {
    const { userId } = res.locals.context;
    const { postId } = req.params;
    const { s3Key, index } = req.body;
    if (!s3Key || index === undefined) {
        return res.status(http_status_1.default.BAD_REQUEST).json({ message: 'S3 key and index are required' });
    }
    const postImage = await service.addPostImage(userId, postId, s3Key, Number(index));
    return res.status(http_status_1.default.CREATED).json(postImage);
});
exports.postRouter.delete('/image/:imageId', async (req, res) => {
    const { userId } = res.locals.context;
    const { imageId } = req.params;
    await service.deletePostImage(userId, imageId);
    return res.status(http_status_1.default.OK).json({ message: 'Image deleted successfully' });
});
exports.postRouter.patch('/image/:imageId', async (req, res) => {
    const { userId } = res.locals.context;
    const { imageId } = req.params;
    const { s3Key } = req.body;
    if (!s3Key) {
        return res.status(http_status_1.default.BAD_REQUEST).json({ message: 'S3 key is required' });
    }
    const postImage = await service.updatePostImage(userId, imageId, s3Key);
    return res.status(http_status_1.default.OK).json(postImage);
});
//# sourceMappingURL=post.controller.js.map