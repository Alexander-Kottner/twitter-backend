"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostRepositoryImpl = void 0;
const dto_1 = require("../dto");
class PostRepositoryImpl {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(userId, data) {
        const post = await this.db.post.create({
            data: {
                authorId: userId,
                content: data.content,
                parentId: data.parentId
            },
            include: {
                images: true
            }
        });
        return this.mapPostToDTO(post);
    }
    mapPostToDTO(post) {
        return new dto_1.PostDTO({
            id: post.id,
            authorId: post.authorId,
            content: post.content,
            createdAt: post.createdAt,
            parentId: post.parentId,
            likeCount: post.likeCount ?? 0,
            retweetCount: post.retweetCount ?? 0,
            images: Array.isArray(post.images)
                ? post.images.map((image) => this.mapPostImageToDTO(image))
                : []
        });
    }
    mapPostImageToDTO(image) {
        return new dto_1.PostImageDTO({
            id: image.id,
            postId: image.postId,
            s3Key: image.s3Key,
            index: image.index,
            createdAt: image.createdAt
        });
    }
    async getPosts(options, whereConditions) {
        const posts = await this.db.post.findMany({
            where: whereConditions || {},
            cursor: options.after ? { id: options.after } : (options.before) ? { id: options.before } : undefined,
            skip: options.after ?? options.before ? 1 : undefined,
            take: options.limit ? (options.before ? -options.limit : options.limit) : undefined,
            orderBy: [
                {
                    createdAt: 'desc'
                },
                {
                    id: 'asc'
                }
            ],
            include: {
                images: {
                    orderBy: {
                        index: 'asc'
                    }
                }
            }
        });
        return posts.map(post => this.mapPostToDTO(post));
    }
    async getFollowingIds(userId) {
        const following = await this.db.follow.findMany({
            where: {
                followerId: userId,
                deletedAt: null
            },
            select: {
                followedId: true
            }
        });
        return following.map((follow) => follow.followedId);
    }
    async checkFollowRelationship(followerId, followedId) {
        const follow = await this.db.follow.findFirst({
            where: {
                followerId,
                followedId,
                deletedAt: null
            }
        });
        return !!follow;
    }
    async getUserPrivacyStatus(userId) {
        const user = await this.db.user.findUnique({
            where: {
                id: userId
            },
            select: {
                isPrivate: true
            }
        });
        return !!user?.isPrivate;
    }
    async delete(postId) {
        await this.db.post.delete({
            where: {
                id: postId
            }
        });
    }
    async getById(postId) {
        const post = await this.db.post.findUnique({
            where: {
                id: postId
            },
            include: {
                images: {
                    orderBy: {
                        index: 'asc'
                    }
                }
            }
        });
        return (post != null) ? this.mapPostToDTO(post) : null;
    }
    async getPostsByAuthorId(authorId) {
        const posts = await this.db.post.findMany({
            where: {
                authorId
            },
            include: {
                images: {
                    orderBy: {
                        index: 'asc'
                    }
                }
            }
        });
        return posts.map(post => this.mapPostToDTO(post));
    }
    async getCommentsByParentId(parentId) {
        const comments = await this.db.post.findMany({
            where: {
                parentId,
                deletedAt: null
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                images: {
                    orderBy: {
                        index: 'asc'
                    }
                }
            }
        });
        return comments.map(post => this.mapPostToDTO(post));
    }
    async getCommentsByParentIdPaginated(parentId, options) {
        const comments = await this.db.post.findMany({
            where: {
                parentId,
                deletedAt: null
            },
            cursor: options.after ? { id: options.after } : (options.before) ? { id: options.before } : undefined,
            skip: options.after ?? options.before ? 1 : undefined,
            take: options.limit ? (options.before ? -options.limit : options.limit) : undefined,
            orderBy: [
                {
                    createdAt: 'desc'
                },
                {
                    id: 'asc'
                }
            ],
            include: {
                images: {
                    orderBy: {
                        index: 'asc'
                    }
                }
            }
        });
        return comments.map(post => this.mapPostToDTO(post));
    }
    async getCommentsByUserId(userId) {
        const comments = await this.db.post.findMany({
            where: {
                authorId: userId,
                parentId: { not: null },
                deletedAt: null
            },
            include: {
                images: {
                    orderBy: {
                        index: 'asc'
                    }
                }
            }
        });
        return comments.map(post => this.mapPostToDTO(post));
    }
    async createPostImage(data) {
        const image = await this.db.postImage.create({
            data: {
                postId: data.postId,
                s3Key: data.s3Key,
                index: data.index
            }
        });
        return this.mapPostImageToDTO(image);
    }
    async getPostImagesByPostId(postId) {
        const images = await this.db.postImage.findMany({
            where: {
                postId,
                deletedAt: null
            },
            orderBy: {
                index: 'asc'
            }
        });
        return images.map(image => this.mapPostImageToDTO(image));
    }
    async deletePostImage(imageId) {
        await this.db.postImage.delete({
            where: {
                id: imageId
            }
        });
    }
    async deletePostImagesByPostId(postId) {
        await this.db.postImage.deleteMany({
            where: {
                postId
            }
        });
    }
    async updatePostImage(imageId, s3Key) {
        const image = await this.db.postImage.update({
            where: {
                id: imageId
            },
            data: {
                s3Key
            }
        });
        return this.mapPostImageToDTO(image);
    }
}
exports.PostRepositoryImpl = PostRepositoryImpl;
//# sourceMappingURL=post.repository.impl.js.map