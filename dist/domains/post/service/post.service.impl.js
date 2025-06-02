"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostServiceImpl = void 0;
const dto_1 = require("../dto");
const class_validator_1 = require("class-validator");
const _utils_1 = require("../../../utils");
const repository_1 = require("../../../domains/reaction/repository");
const _utils_2 = require("../../../utils");
const dto_2 = require("../../../domains/reaction/dto");
const repository_2 = require("../../../domains/user/repository");
const s3_1 = require("../../../utils/s3");
class PostServiceImpl {
    repository;
    reactionRepository;
    userRepository;
    constructor(repository) {
        this.repository = repository;
        this.reactionRepository = new repository_1.ReactionRepositoryImpl(_utils_2.db);
        this.userRepository = new repository_2.UserRepositoryImpl(_utils_2.db);
    }
    async createPost(userId, data) {
        await (0, class_validator_1.validate)(data);
        return await this.repository.create(userId, data);
    }
    async deletePost(userId, postId) {
        const post = await this.repository.getById(postId);
        if (!post)
            throw new _utils_1.NotFoundException('post');
        if (post.authorId !== userId)
            throw new _utils_1.ForbiddenException();
        await this.repository.delete(postId);
    }
    async getPost(userId, postId) {
        const post = await this.repository.getById(postId);
        if (!post)
            throw new _utils_1.NotFoundException('post');
        let isAuthorPrivate = false;
        let isFollowing = false;
        if (post.authorId !== userId) {
            isAuthorPrivate = await this.repository.getUserPrivacyStatus(post.authorId);
            if (isAuthorPrivate) {
                isFollowing = await this.repository.checkFollowRelationship(userId, post.authorId);
                if (!isFollowing) {
                    throw new _utils_1.NotFoundException('post');
                }
            }
        }
        const hasLiked = await this.reactionRepository.getByPostIdAndUserId(postId, userId, dto_2.ReactionType.LIKE) !== null;
        const hasRetweeted = await this.reactionRepository.getByPostIdAndUserId(postId, userId, dto_2.ReactionType.RETWEET) !== null;
        const comments = await this.repository.getCommentsByParentId(postId);
        const commentCount = comments.length;
        const author = await this.userRepository.getById(post.authorId);
        if (!author) {
            throw new _utils_1.NotFoundException('user');
        }
        if (post.images && post.images.length > 0) {
            const imagesWithUrls = await Promise.all(post.images.map(async (image) => {
                const imageUrl = await (0, s3_1.getPostImageUrl)(image.s3Key, userId, post.authorId, isAuthorPrivate, isFollowing);
                return {
                    ...image,
                    url: imageUrl
                };
            }));
            post.images = imagesWithUrls;
        }
        return new dto_1.ExtendedPostDTO({
            ...post,
            author: author,
            qtyComments: commentCount,
            qtyLikes: post.likeCount,
            qtyRetweets: post.retweetCount,
            hasLiked,
            hasRetweeted
        });
    }
    async getLatestPosts(userId, options) {
        const followingIds = await this.repository.getFollowingIds(userId);
        const whereCondition = {
            OR: [
                {
                    author: {
                        isPrivate: false
                    }
                },
                {
                    authorId: {
                        in: followingIds
                    }
                }
            ]
        };
        const posts = await this.repository.getPosts(options, whereCondition);
        const extendedPosts = await Promise.all(posts.map(async (post) => {
            const hasLiked = await this.reactionRepository.getByPostIdAndUserId(post.id, userId, dto_2.ReactionType.LIKE) !== null;
            const hasRetweeted = await this.reactionRepository.getByPostIdAndUserId(post.id, userId, dto_2.ReactionType.RETWEET) !== null;
            const comments = await this.repository.getCommentsByParentId(post.id);
            const commentCount = comments.length;
            const author = await this.userRepository.getById(post.authorId);
            let isAuthorPrivate = false;
            let isFollowing = false;
            if (author && post.authorId !== userId) {
                isAuthorPrivate = author.isPrivate;
                if (isAuthorPrivate) {
                    isFollowing = await this.repository.checkFollowRelationship(userId, post.authorId);
                }
            }
            if (post.images && post.images.length > 0) {
                const imagesWithUrls = await Promise.all(post.images.map(async (image) => {
                    const imageUrl = await (0, s3_1.getPostImageUrl)(image.s3Key, userId, post.authorId, isAuthorPrivate, isFollowing);
                    return {
                        ...image,
                        url: imageUrl
                    };
                }));
                post.images = imagesWithUrls;
            }
            return new dto_1.ExtendedPostDTO({
                ...post,
                author: author || {
                    id: post.authorId,
                    name: 'Usuario eliminado',
                    username: 'usuario',
                    createdAt: new Date(),
                    isPrivate: false
                },
                qtyComments: commentCount,
                qtyLikes: post.likeCount,
                qtyRetweets: post.retweetCount,
                hasLiked,
                hasRetweeted
            });
        }));
        return extendedPosts;
    }
    async getPostsByAuthor(userId, authorId) {
        const isAuthorExists = await this.checkUserExists(authorId);
        if (!isAuthorExists) {
            throw new _utils_1.NotFoundException('user');
        }
        let isAuthorPrivate = false;
        let isFollowing = false;
        if (authorId !== userId) {
            isAuthorPrivate = await this.repository.getUserPrivacyStatus(authorId);
            if (isAuthorPrivate) {
                isFollowing = await this.repository.checkFollowRelationship(userId, authorId);
                if (!isFollowing) {
                    throw new _utils_1.NotFoundException('user');
                }
            }
        }
        const posts = await this.repository.getPostsByAuthorId(authorId);
        const author = await this.userRepository.getById(authorId);
        if (!author) {
            throw new _utils_1.NotFoundException('user');
        }
        const extendedPosts = await Promise.all(posts.map(async (post) => {
            const hasLiked = await this.reactionRepository.getByPostIdAndUserId(post.id, userId, dto_2.ReactionType.LIKE) !== null;
            const hasRetweeted = await this.reactionRepository.getByPostIdAndUserId(post.id, userId, dto_2.ReactionType.RETWEET) !== null;
            const comments = await this.repository.getCommentsByParentId(post.id);
            const commentCount = comments.length;
            if (post.images && post.images.length > 0) {
                const imagesWithUrls = await Promise.all(post.images.map(async (image) => {
                    const imageUrl = await (0, s3_1.getPostImageUrl)(image.s3Key, userId, authorId, isAuthorPrivate, isFollowing);
                    return {
                        ...image,
                        url: imageUrl
                    };
                }));
                post.images = imagesWithUrls;
            }
            return new dto_1.ExtendedPostDTO({
                ...post,
                author: author,
                qtyComments: commentCount,
                qtyLikes: post.likeCount,
                qtyRetweets: post.retweetCount,
                hasLiked,
                hasRetweeted
            });
        }));
        return extendedPosts;
    }
    async createComment(userId, postId, data) {
        const post = await this.repository.getById(postId);
        if (!post)
            throw new _utils_1.NotFoundException('post');
        if (post.authorId !== userId) {
            const isAuthorPrivate = await this.repository.getUserPrivacyStatus(post.authorId);
            if (isAuthorPrivate) {
                const isFollowing = await this.repository.checkFollowRelationship(userId, post.authorId);
                if (!isFollowing) {
                    throw new _utils_1.NotFoundException('post');
                }
            }
        }
        const commentData = {
            content: data.content,
            parentId: postId
        };
        await (0, class_validator_1.validate)(commentData);
        return await this.repository.create(userId, commentData);
    }
    async getCommentsByPostId(userId, postId) {
        const post = await this.repository.getById(postId);
        if (!post)
            throw new _utils_1.NotFoundException('post');
        if (post.authorId !== userId) {
            const isAuthorPrivate = await this.repository.getUserPrivacyStatus(post.authorId);
            if (isAuthorPrivate) {
                const isFollowing = await this.repository.checkFollowRelationship(userId, post.authorId);
                if (!isFollowing) {
                    throw new _utils_1.NotFoundException('post');
                }
            }
        }
        const comments = await this.repository.getCommentsByParentId(postId);
        const extendedComments = await Promise.all(comments.map(async (comment) => {
            const hasLiked = await this.reactionRepository.getByPostIdAndUserId(comment.id, userId, dto_2.ReactionType.LIKE) !== null;
            const hasRetweeted = await this.reactionRepository.getByPostIdAndUserId(comment.id, userId, dto_2.ReactionType.RETWEET) !== null;
            const nestedComments = await this.repository.getCommentsByParentId(comment.id);
            const commentCount = nestedComments.length;
            const author = await this.userRepository.getById(comment.authorId);
            if (!author) {
                throw new _utils_1.NotFoundException('user');
            }
            return new dto_1.ExtendedPostDTO({
                ...comment,
                author: author,
                qtyComments: commentCount,
                qtyLikes: comment.likeCount,
                qtyRetweets: comment.retweetCount,
                hasLiked,
                hasRetweeted
            });
        }));
        return extendedComments;
    }
    async getCommentsByPostIdPaginated(userId, postId, options) {
        const post = await this.repository.getById(postId);
        if (!post)
            throw new _utils_1.NotFoundException('post');
        if (post.authorId !== userId) {
            const isAuthorPrivate = await this.repository.getUserPrivacyStatus(post.authorId);
            if (isAuthorPrivate) {
                const isFollowing = await this.repository.checkFollowRelationship(userId, post.authorId);
                if (!isFollowing) {
                    throw new _utils_1.NotFoundException('post');
                }
            }
        }
        const comments = await this.repository.getCommentsByParentIdPaginated(postId, options);
        const extendedComments = await Promise.all(comments.map(async (comment) => {
            const hasLiked = await this.reactionRepository.getByPostIdAndUserId(comment.id, userId, dto_2.ReactionType.LIKE) !== null;
            const hasRetweeted = await this.reactionRepository.getByPostIdAndUserId(comment.id, userId, dto_2.ReactionType.RETWEET) !== null;
            const nestedComments = await this.repository.getCommentsByParentId(comment.id);
            const commentCount = nestedComments.length;
            const author = await this.userRepository.getById(comment.authorId);
            if (!author) {
                throw new _utils_1.NotFoundException('user');
            }
            return new dto_1.ExtendedPostDTO({
                ...comment,
                author: author,
                qtyComments: commentCount,
                qtyLikes: comment.likeCount,
                qtyRetweets: comment.retweetCount,
                hasLiked,
                hasRetweeted
            });
        }));
        extendedComments.sort((a, b) => {
            const totalReactionsA = (a.qtyLikes || 0) + (a.qtyRetweets || 0);
            const totalReactionsB = (b.qtyLikes || 0) + (b.qtyRetweets || 0);
            return totalReactionsB - totalReactionsA;
        });
        return extendedComments;
    }
    async getPostsWithComments(userId, postId) {
        const post = await this.getPost(userId, postId);
        const comments = await this.getCommentsByPostId(userId, postId);
        post.comments = comments;
        return post;
    }
    async checkUserExists(userId) {
        const user = await this.userRepository.getById(userId);
        return user !== null;
    }
    async getCommentsByUserId(userId, targetUserId) {
        const isTargetUserExists = await this.checkUserExists(targetUserId);
        if (!isTargetUserExists) {
            throw new _utils_1.NotFoundException('user');
        }
        if (targetUserId !== userId) {
            const isTargetUserPrivate = await this.repository.getUserPrivacyStatus(targetUserId);
            if (isTargetUserPrivate) {
                const isFollowing = await this.repository.checkFollowRelationship(userId, targetUserId);
                if (!isFollowing) {
                    throw new _utils_1.NotFoundException('user');
                }
            }
        }
        const comments = await this.repository.getCommentsByUserId(targetUserId);
        const author = await this.userRepository.getById(targetUserId);
        if (!author) {
            throw new _utils_1.NotFoundException('user');
        }
        const extendedComments = await Promise.all(comments.map(async (comment) => {
            const hasLiked = await this.reactionRepository.getByPostIdAndUserId(comment.id, userId, dto_2.ReactionType.LIKE) !== null;
            const hasRetweeted = await this.reactionRepository.getByPostIdAndUserId(comment.id, userId, dto_2.ReactionType.RETWEET) !== null;
            const replies = await this.repository.getCommentsByParentId(comment.id);
            const commentCount = replies.length;
            return new dto_1.ExtendedPostDTO({
                ...comment,
                author: author,
                qtyComments: commentCount,
                qtyLikes: comment.likeCount,
                qtyRetweets: comment.retweetCount,
                hasLiked,
                hasRetweeted
            });
        }));
        return extendedComments;
    }
    async generatePostImageUploadUrl(userId, postId, fileExt, index) {
        const post = await this.repository.getById(postId);
        if (!post)
            throw new _utils_1.NotFoundException('post');
        if (post.authorId !== userId)
            throw new _utils_1.ForbiddenException();
        if (index < 0 || index > 3) {
            throw new _utils_1.ForbiddenException('Image index must be between 0 and 3');
        }
        const existingImages = await this.repository.getPostImagesByPostId(postId);
        if (existingImages.length >= 4) {
            throw new _utils_1.ForbiddenException('Maximum of 4 images per post allowed');
        }
        const key = (0, s3_1.generatePostPictureKey)(postId, index, fileExt);
        const contentType = this.getContentTypeFromFileExt(fileExt);
        const uploadUrl = await (0, s3_1.generateUploadUrl)(key, contentType);
        return { uploadUrl, key };
    }
    async addPostImage(userId, postId, s3Key, index) {
        const post = await this.repository.getById(postId);
        if (!post)
            throw new _utils_1.NotFoundException('post');
        if (post.authorId !== userId)
            throw new _utils_1.ForbiddenException();
        if (index < 0 || index > 3) {
            throw new _utils_1.ForbiddenException('Image index must be between 0 and 3');
        }
        const existingImages = await this.repository.getPostImagesByPostId(postId);
        const existingImageAtIndex = existingImages.find(img => img.index === index);
        if (existingImageAtIndex) {
            return await this.repository.updatePostImage(existingImageAtIndex.id, s3Key);
        }
        else {
            if (existingImages.length >= 4) {
                throw new _utils_1.ForbiddenException('Maximum of 4 images per post allowed');
            }
            const imageData = {
                postId,
                s3Key,
                index
            };
            return await this.repository.createPostImage(imageData);
        }
    }
    async updatePostImage(userId, imageId, s3Key) {
        const images = await this.repository.getPostImagesByPostId(imageId);
        if (!images || images.length === 0)
            throw new _utils_1.NotFoundException('image');
        const post = await this.repository.getById(images[0].postId);
        if (!post)
            throw new _utils_1.NotFoundException('post');
        if (post.authorId !== userId)
            throw new _utils_1.ForbiddenException();
        return await this.repository.updatePostImage(imageId, s3Key);
    }
    async deletePostImage(userId, imageId) {
        const images = await this.repository.getPostImagesByPostId(imageId);
        if (!images || images.length === 0)
            throw new _utils_1.NotFoundException('image');
        const post = await this.repository.getById(images[0].postId);
        if (!post)
            throw new _utils_1.NotFoundException('post');
        if (post.authorId !== userId)
            throw new _utils_1.ForbiddenException();
        await this.repository.deletePostImage(imageId);
    }
    async getPostImages(userId, postId) {
        const post = await this.repository.getById(postId);
        if (!post)
            throw new _utils_1.NotFoundException('post');
        let isAuthorPrivate = false;
        let isFollowing = false;
        if (post.authorId !== userId) {
            isAuthorPrivate = await this.repository.getUserPrivacyStatus(post.authorId);
            if (isAuthorPrivate) {
                isFollowing = await this.repository.checkFollowRelationship(userId, post.authorId);
                if (!isFollowing) {
                    throw new _utils_1.NotFoundException('post');
                }
            }
        }
        const images = await this.repository.getPostImagesByPostId(postId);
        const imagesWithUrls = await Promise.all(images.map(async (image) => {
            const imageUrl = await (0, s3_1.getPostImageUrl)(image.s3Key, userId, post.authorId, isAuthorPrivate, isFollowing);
            return {
                ...image,
                url: imageUrl
            };
        }));
        return imagesWithUrls;
    }
    getContentTypeFromFileExt(fileExt) {
        switch (fileExt.toLowerCase()) {
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.png':
                return 'image/png';
            case '.gif':
                return 'image/gif';
            case '.webp':
                return 'image/webp';
            default:
                return 'application/octet-stream';
        }
    }
}
exports.PostServiceImpl = PostServiceImpl;
//# sourceMappingURL=post.service.impl.js.map