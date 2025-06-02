"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactionRepositoryImpl = void 0;
const dto_1 = require("../dto");
class ReactionRepositoryImpl {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(userId, postId, type) {
        const existingReaction = await this.getByPostIdAndUserId(postId, userId, type);
        if (existingReaction) {
            return existingReaction;
        }
        return await this.db.$transaction(async (tx) => {
            const reaction = await tx.reaction.create({
                data: {
                    userId,
                    postId,
                    type
                }
            });
            if (type === dto_1.ReactionType.LIKE) {
                await tx.post.update({
                    where: { id: postId },
                    data: { likeCount: { increment: 1 } }
                });
            }
            else if (type === dto_1.ReactionType.RETWEET) {
                await tx.post.update({
                    where: { id: postId },
                    data: { retweetCount: { increment: 1 } }
                });
            }
            return new dto_1.ReactionDTO({
                id: reaction.id,
                userId: reaction.userId,
                postId: reaction.postId,
                type: reaction.type,
                createdAt: reaction.createdAt
            });
        });
    }
    async delete(userId, postId, type) {
        const existingReaction = await this.getByPostIdAndUserId(postId, userId, type);
        if (!existingReaction) {
            return;
        }
        await this.db.$transaction(async (tx) => {
            await tx.reaction.deleteMany({
                where: {
                    userId,
                    postId,
                    type,
                    deletedAt: null
                }
            });
            if (type === dto_1.ReactionType.LIKE) {
                await tx.post.update({
                    where: { id: postId },
                    data: {
                        likeCount: {
                            decrement: 1
                        }
                    }
                });
            }
            else if (type === dto_1.ReactionType.RETWEET) {
                await tx.post.update({
                    where: { id: postId },
                    data: {
                        retweetCount: {
                            decrement: 1
                        }
                    }
                });
            }
        });
    }
    async getByPostIdAndUserId(postId, userId, type) {
        const reaction = await this.db.reaction.findFirst({
            where: {
                postId,
                userId,
                type,
                deletedAt: null
            }
        });
        if (!reaction)
            return null;
        return new dto_1.ReactionDTO({
            id: reaction.id,
            userId: reaction.userId,
            postId: reaction.postId,
            type: reaction.type,
            createdAt: reaction.createdAt
        });
    }
    async getCountByPostId(postId, type) {
        const post = await this.db.post.findUnique({
            where: { id: postId },
            select: {
                likeCount: type === dto_1.ReactionType.LIKE,
                retweetCount: type === dto_1.ReactionType.RETWEET
            }
        });
        if (!post)
            return 0;
        return type === dto_1.ReactionType.LIKE ? post.likeCount : post.retweetCount;
    }
    async getByUserId(userId, type) {
        const reactions = await this.db.reaction.findMany({
            where: {
                userId,
                type,
                deletedAt: null
            },
            include: {
                post: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return reactions.map(reaction => new dto_1.ReactionDTO({
            id: reaction.id,
            userId: reaction.userId,
            postId: reaction.postId,
            type: reaction.type,
            createdAt: reaction.createdAt
        }));
    }
    async syncReactionCounts(postId) {
        const [likeCount, retweetCount] = await Promise.all([
            this.db.reaction.count({
                where: {
                    postId,
                    type: 'LIKE',
                    deletedAt: null
                }
            }),
            this.db.reaction.count({
                where: {
                    postId,
                    type: 'RETWEET',
                    deletedAt: null
                }
            })
        ]);
        await this.db.post.update({
            where: { id: postId },
            data: {
                likeCount,
                retweetCount
            }
        });
    }
    async getAllPostIds() {
        const posts = await this.db.post.findMany({
            select: { id: true },
            where: { deletedAt: null }
        });
        return posts.map(post => post.id);
    }
}
exports.ReactionRepositoryImpl = ReactionRepositoryImpl;
//# sourceMappingURL=reaction.repository.impl.js.map