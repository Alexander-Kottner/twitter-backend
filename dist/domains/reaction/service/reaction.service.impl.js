"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactionServiceImpl = void 0;
const dto_1 = require("../dto");
class ReactionServiceImpl {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async createReaction(userId, postId, type) {
        const existingReaction = await this.repository.getByPostIdAndUserId(postId, userId, type);
        if (existingReaction) {
            return existingReaction;
        }
        return this.repository.create(userId, postId, type);
    }
    async deleteReaction(userId, postId, type) {
        await this.repository.delete(userId, postId, type);
    }
    async getReactionCountsForPost(postId) {
        const [likes, retweets] = await Promise.all([
            this.repository.getCountByPostId(postId, dto_1.ReactionType.LIKE),
            this.repository.getCountByPostId(postId, dto_1.ReactionType.RETWEET)
        ]);
        return { likes, retweets };
    }
    async hasUserReacted(userId, postId, type) {
        const reaction = await this.repository.getByPostIdAndUserId(postId, userId, type);
        return reaction !== null;
    }
    async getUserReactions(userId, type) {
        return this.repository.getByUserId(userId, type);
    }
    async syncAllReactionCounts() {
        const postIds = await this.repository.getAllPostIds();
        console.log(`Starting to sync reaction counts for ${postIds.length} posts`);
        const batchSize = 100;
        for (let i = 0; i < postIds.length; i += batchSize) {
            const batch = postIds.slice(i, i + batchSize);
            await Promise.all(batch.map(async (postId) => {
                await this.repository.syncReactionCounts(postId);
            }));
            console.log(`Processed reaction counts for posts ${i + 1} to ${Math.min(i + batchSize, postIds.length)}`);
        }
        console.log('Reaction count sync completed');
    }
}
exports.ReactionServiceImpl = ReactionServiceImpl;
//# sourceMappingURL=reaction.service.impl.js.map