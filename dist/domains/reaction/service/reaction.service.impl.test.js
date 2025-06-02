"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reaction_service_impl_1 = require("./reaction.service.impl");
const dto_1 = require("../dto");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('ReactionServiceImpl', () => {
    let reactionService;
    let mockRepository;
    const createMockReaction = (overrides = {}) => ({
        id: 'reaction-1',
        userId: 'user-1',
        postId: 'post-1',
        type: dto_1.ReactionType.LIKE,
        createdAt: new Date(),
        ...overrides
    });
    (0, globals_1.beforeEach)(() => {
        mockRepository = {
            create: globals_1.jest.fn(),
            delete: globals_1.jest.fn(),
            getByPostIdAndUserId: globals_1.jest.fn(),
            getCountByPostId: globals_1.jest.fn(),
            getByUserId: globals_1.jest.fn(),
            syncReactionCounts: globals_1.jest.fn(),
            getAllPostIds: globals_1.jest.fn()
        };
        globals_1.jest.clearAllMocks();
        reactionService = new reaction_service_impl_1.ReactionServiceImpl(mockRepository);
    });
    (0, globals_1.describe)('createReaction', () => {
        (0, globals_1.it)('should return existing reaction when user has already reacted', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.LIKE;
            const existingReaction = createMockReaction({ userId, postId, type });
            mockRepository.getByPostIdAndUserId.mockResolvedValue(existingReaction);
            const result = await reactionService.createReaction(userId, postId, type);
            (0, globals_1.expect)(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type);
            (0, globals_1.expect)(mockRepository.create).not.toHaveBeenCalled();
            (0, globals_1.expect)(result).toEqual(existingReaction);
        });
        (0, globals_1.it)('should create new reaction when user has not reacted before', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.LIKE;
            const newReaction = createMockReaction({ userId, postId, type });
            mockRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue(newReaction);
            const result = await reactionService.createReaction(userId, postId, type);
            (0, globals_1.expect)(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type);
            (0, globals_1.expect)(mockRepository.create).toHaveBeenCalledWith(userId, postId, type);
            (0, globals_1.expect)(result).toEqual(newReaction);
        });
        (0, globals_1.it)('should handle RETWEET type reactions correctly', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.RETWEET;
            const retweetReaction = createMockReaction({ userId, postId, type });
            mockRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue(retweetReaction);
            const result = await reactionService.createReaction(userId, postId, type);
            (0, globals_1.expect)(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type);
            (0, globals_1.expect)(mockRepository.create).toHaveBeenCalledWith(userId, postId, type);
            (0, globals_1.expect)(result.type).toBe(dto_1.ReactionType.RETWEET);
        });
        (0, globals_1.it)('should handle repository errors during existence check', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.LIKE;
            const repositoryError = new Error('Database connection failed');
            mockRepository.getByPostIdAndUserId.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(reactionService.createReaction(userId, postId, type)).rejects.toThrow('Database connection failed');
            (0, globals_1.expect)(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type);
            (0, globals_1.expect)(mockRepository.create).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle repository errors during creation', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.LIKE;
            const repositoryError = new Error('Failed to create reaction');
            mockRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockRepository.create.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(reactionService.createReaction(userId, postId, type)).rejects.toThrow('Failed to create reaction');
            (0, globals_1.expect)(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type);
            (0, globals_1.expect)(mockRepository.create).toHaveBeenCalledWith(userId, postId, type);
        });
        (0, globals_1.it)('should handle empty string parameters', async () => {
            const userId = '';
            const postId = '';
            const type = dto_1.ReactionType.LIKE;
            const reaction = createMockReaction({ userId, postId, type });
            mockRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue(reaction);
            const result = await reactionService.createReaction(userId, postId, type);
            (0, globals_1.expect)(result).toEqual(reaction);
            (0, globals_1.expect)(mockRepository.create).toHaveBeenCalledWith(userId, postId, type);
        });
        (0, globals_1.it)('should handle special characters in user and post IDs', async () => {
            const userId = 'user-with-special-chars-@#$';
            const postId = 'post-with-números-123';
            const type = dto_1.ReactionType.LIKE;
            const reaction = createMockReaction({ userId, postId, type });
            mockRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue(reaction);
            const result = await reactionService.createReaction(userId, postId, type);
            (0, globals_1.expect)(result).toEqual(reaction);
            (0, globals_1.expect)(mockRepository.create).toHaveBeenCalledWith(userId, postId, type);
        });
    });
    (0, globals_1.describe)('deleteReaction', () => {
        (0, globals_1.it)('should call repository delete with correct parameters', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.LIKE;
            mockRepository.delete.mockResolvedValue(undefined);
            await reactionService.deleteReaction(userId, postId, type);
            (0, globals_1.expect)(mockRepository.delete).toHaveBeenCalledWith(userId, postId, type);
        });
        (0, globals_1.it)('should handle RETWEET deletion correctly', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.RETWEET;
            mockRepository.delete.mockResolvedValue(undefined);
            await reactionService.deleteReaction(userId, postId, type);
            (0, globals_1.expect)(mockRepository.delete).toHaveBeenCalledWith(userId, postId, type);
        });
        (0, globals_1.it)('should handle repository errors during deletion', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.LIKE;
            const repositoryError = new Error('Failed to delete reaction');
            mockRepository.delete.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(reactionService.deleteReaction(userId, postId, type)).rejects.toThrow('Failed to delete reaction');
            (0, globals_1.expect)(mockRepository.delete).toHaveBeenCalledWith(userId, postId, type);
        });
        (0, globals_1.it)('should handle empty string parameters', async () => {
            const userId = '';
            const postId = '';
            const type = dto_1.ReactionType.LIKE;
            mockRepository.delete.mockResolvedValue(undefined);
            await reactionService.deleteReaction(userId, postId, type);
            (0, globals_1.expect)(mockRepository.delete).toHaveBeenCalledWith(userId, postId, type);
        });
        (0, globals_1.it)('should handle special characters in parameters', async () => {
            const userId = 'user-with-special-chars-@#$';
            const postId = 'post-with-números-123';
            const type = dto_1.ReactionType.RETWEET;
            mockRepository.delete.mockResolvedValue(undefined);
            await reactionService.deleteReaction(userId, postId, type);
            (0, globals_1.expect)(mockRepository.delete).toHaveBeenCalledWith(userId, postId, type);
        });
    });
    (0, globals_1.describe)('getReactionCountsForPost', () => {
        (0, globals_1.it)('should return correct like and retweet counts', async () => {
            const postId = 'post-1';
            const expectedLikes = 42;
            const expectedRetweets = 15;
            mockRepository.getCountByPostId
                .mockResolvedValueOnce(expectedLikes)
                .mockResolvedValueOnce(expectedRetweets);
            const result = await reactionService.getReactionCountsForPost(postId);
            (0, globals_1.expect)(mockRepository.getCountByPostId).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(mockRepository.getCountByPostId).toHaveBeenCalledWith(postId, dto_1.ReactionType.LIKE);
            (0, globals_1.expect)(mockRepository.getCountByPostId).toHaveBeenCalledWith(postId, dto_1.ReactionType.RETWEET);
            (0, globals_1.expect)(result).toEqual({ likes: expectedLikes, retweets: expectedRetweets });
        });
        (0, globals_1.it)('should return zero counts when post has no reactions', async () => {
            const postId = 'post-1';
            mockRepository.getCountByPostId
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(0);
            const result = await reactionService.getReactionCountsForPost(postId);
            (0, globals_1.expect)(result).toEqual({ likes: 0, retweets: 0 });
        });
        (0, globals_1.it)('should handle repository errors during count retrieval', async () => {
            const postId = 'post-1';
            const repositoryError = new Error('Database connection failed');
            mockRepository.getCountByPostId.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(reactionService.getReactionCountsForPost(postId)).rejects.toThrow('Database connection failed');
            (0, globals_1.expect)(mockRepository.getCountByPostId).toHaveBeenCalledWith(postId, dto_1.ReactionType.LIKE);
        });
        (0, globals_1.it)('should handle partial repository failures', async () => {
            const postId = 'post-1';
            const repositoryError = new Error('Retweet count query failed');
            mockRepository.getCountByPostId
                .mockResolvedValueOnce(42)
                .mockRejectedValueOnce(repositoryError);
            await (0, globals_1.expect)(reactionService.getReactionCountsForPost(postId)).rejects.toThrow('Retweet count query failed');
            (0, globals_1.expect)(mockRepository.getCountByPostId).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should handle empty post ID', async () => {
            const postId = '';
            mockRepository.getCountByPostId
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(0);
            const result = await reactionService.getReactionCountsForPost(postId);
            (0, globals_1.expect)(result).toEqual({ likes: 0, retweets: 0 });
            (0, globals_1.expect)(mockRepository.getCountByPostId).toHaveBeenCalledWith(postId, dto_1.ReactionType.LIKE);
            (0, globals_1.expect)(mockRepository.getCountByPostId).toHaveBeenCalledWith(postId, dto_1.ReactionType.RETWEET);
        });
        (0, globals_1.it)('should handle very large count numbers', async () => {
            const postId = 'post-1';
            const largeLikeCount = 999999999;
            const largeRetweetCount = 888888888;
            mockRepository.getCountByPostId
                .mockResolvedValueOnce(largeLikeCount)
                .mockResolvedValueOnce(largeRetweetCount);
            const result = await reactionService.getReactionCountsForPost(postId);
            (0, globals_1.expect)(result).toEqual({ likes: largeLikeCount, retweets: largeRetweetCount });
        });
    });
    (0, globals_1.describe)('hasUserReacted', () => {
        (0, globals_1.it)('should return true when user has reacted', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.LIKE;
            const existingReaction = createMockReaction({ userId, postId, type });
            mockRepository.getByPostIdAndUserId.mockResolvedValue(existingReaction);
            const result = await reactionService.hasUserReacted(userId, postId, type);
            (0, globals_1.expect)(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type);
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('should return false when user has not reacted', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.LIKE;
            mockRepository.getByPostIdAndUserId.mockResolvedValue(null);
            const result = await reactionService.hasUserReacted(userId, postId, type);
            (0, globals_1.expect)(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type);
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should handle RETWEET type reactions correctly', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.RETWEET;
            const retweetReaction = createMockReaction({ userId, postId, type });
            mockRepository.getByPostIdAndUserId.mockResolvedValue(retweetReaction);
            const result = await reactionService.hasUserReacted(userId, postId, type);
            (0, globals_1.expect)(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type);
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('should handle repository errors during reaction check', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.LIKE;
            const repositoryError = new Error('Database connection failed');
            mockRepository.getByPostIdAndUserId.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(reactionService.hasUserReacted(userId, postId, type)).rejects.toThrow('Database connection failed');
            (0, globals_1.expect)(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type);
        });
        (0, globals_1.it)('should handle empty string parameters', async () => {
            const userId = '';
            const postId = '';
            const type = dto_1.ReactionType.LIKE;
            mockRepository.getByPostIdAndUserId.mockResolvedValue(null);
            const result = await reactionService.hasUserReacted(userId, postId, type);
            (0, globals_1.expect)(result).toBe(false);
            (0, globals_1.expect)(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type);
        });
    });
    (0, globals_1.describe)('getUserReactions', () => {
        (0, globals_1.it)('should return user reactions for LIKE type', async () => {
            const userId = 'user-1';
            const type = dto_1.ReactionType.LIKE;
            const userReactions = [
                createMockReaction({ userId, type, postId: 'post-1' }),
                createMockReaction({ userId, type, postId: 'post-2' })
            ];
            mockRepository.getByUserId.mockResolvedValue(userReactions);
            const result = await reactionService.getUserReactions(userId, type);
            (0, globals_1.expect)(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type);
            (0, globals_1.expect)(result).toEqual(userReactions);
            (0, globals_1.expect)(result).toHaveLength(2);
        });
        (0, globals_1.it)('should return user reactions for RETWEET type', async () => {
            const userId = 'user-1';
            const type = dto_1.ReactionType.RETWEET;
            const userRetweets = [
                createMockReaction({ userId, type, postId: 'post-1' }),
                createMockReaction({ userId, type, postId: 'post-3' })
            ];
            mockRepository.getByUserId.mockResolvedValue(userRetweets);
            const result = await reactionService.getUserReactions(userId, type);
            (0, globals_1.expect)(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type);
            (0, globals_1.expect)(result).toEqual(userRetweets);
            (0, globals_1.expect)(result.every(r => r.type === dto_1.ReactionType.RETWEET)).toBe(true);
        });
        (0, globals_1.it)('should return empty array when user has no reactions', async () => {
            const userId = 'user-1';
            const type = dto_1.ReactionType.LIKE;
            mockRepository.getByUserId.mockResolvedValue([]);
            const result = await reactionService.getUserReactions(userId, type);
            (0, globals_1.expect)(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type);
            (0, globals_1.expect)(result).toEqual([]);
            (0, globals_1.expect)(result).toHaveLength(0);
        });
        (0, globals_1.it)('should handle repository errors during user reactions retrieval', async () => {
            const userId = 'user-1';
            const type = dto_1.ReactionType.LIKE;
            const repositoryError = new Error('Database connection failed');
            mockRepository.getByUserId.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(reactionService.getUserReactions(userId, type)).rejects.toThrow('Database connection failed');
            (0, globals_1.expect)(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type);
        });
        (0, globals_1.it)('should handle empty user ID', async () => {
            const userId = '';
            const type = dto_1.ReactionType.LIKE;
            mockRepository.getByUserId.mockResolvedValue([]);
            const result = await reactionService.getUserReactions(userId, type);
            (0, globals_1.expect)(result).toEqual([]);
            (0, globals_1.expect)(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type);
        });
        (0, globals_1.it)('should handle large number of user reactions', async () => {
            const userId = 'user-1';
            const type = dto_1.ReactionType.LIKE;
            const manyReactions = Array.from({ length: 1000 }, (_, index) => createMockReaction({ userId, type, postId: `post-${index}` }));
            mockRepository.getByUserId.mockResolvedValue(manyReactions);
            const result = await reactionService.getUserReactions(userId, type);
            (0, globals_1.expect)(result).toHaveLength(1000);
            (0, globals_1.expect)(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type);
        });
    });
    (0, globals_1.describe)('syncAllReactionCounts', () => {
        (0, globals_1.beforeEach)(() => {
            globals_1.jest.spyOn(console, 'log').mockImplementation(() => { });
        });
        (0, globals_1.afterEach)(() => {
            ;
            console.log.mockRestore();
        });
        (0, globals_1.it)('should sync reaction counts for all posts in batches', async () => {
            const postIds = Array.from({ length: 250 }, (_, i) => `post-${i}`);
            mockRepository.getAllPostIds.mockResolvedValue(postIds);
            mockRepository.syncReactionCounts.mockResolvedValue(undefined);
            await reactionService.syncAllReactionCounts();
            (0, globals_1.expect)(mockRepository.getAllPostIds).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockRepository.syncReactionCounts).toHaveBeenCalledTimes(250);
            postIds.forEach(postId => {
                (0, globals_1.expect)(mockRepository.syncReactionCounts).toHaveBeenCalledWith(postId);
            });
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Starting to sync reaction counts for 250 posts');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 1 to 100');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 101 to 200');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 201 to 250');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Reaction count sync completed');
        });
        (0, globals_1.it)('should handle empty post list', async () => {
            mockRepository.getAllPostIds.mockResolvedValue([]);
            await reactionService.syncAllReactionCounts();
            (0, globals_1.expect)(mockRepository.getAllPostIds).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockRepository.syncReactionCounts).not.toHaveBeenCalled();
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Starting to sync reaction counts for 0 posts');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Reaction count sync completed');
        });
        (0, globals_1.it)('should handle exactly one batch (100 posts)', async () => {
            const postIds = Array.from({ length: 100 }, (_, i) => `post-${i}`);
            mockRepository.getAllPostIds.mockResolvedValue(postIds);
            mockRepository.syncReactionCounts.mockResolvedValue(undefined);
            await reactionService.syncAllReactionCounts();
            (0, globals_1.expect)(mockRepository.syncReactionCounts).toHaveBeenCalledTimes(100);
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Starting to sync reaction counts for 100 posts');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 1 to 100');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Reaction count sync completed');
        });
        (0, globals_1.it)('should handle repository errors during getAllPostIds', async () => {
            const repositoryError = new Error('Failed to retrieve post IDs');
            mockRepository.getAllPostIds.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(reactionService.syncAllReactionCounts()).rejects.toThrow('Failed to retrieve post IDs');
            (0, globals_1.expect)(mockRepository.getAllPostIds).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockRepository.syncReactionCounts).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle repository errors during syncReactionCounts', async () => {
            const postIds = ['post-1', 'post-2', 'post-3'];
            const repositoryError = new Error('Failed to sync reaction counts');
            mockRepository.getAllPostIds.mockResolvedValue(postIds);
            mockRepository.syncReactionCounts.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(reactionService.syncAllReactionCounts()).rejects.toThrow('Failed to sync reaction counts');
            (0, globals_1.expect)(mockRepository.getAllPostIds).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockRepository.syncReactionCounts).toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle partial failures in batch processing', async () => {
            const postIds = ['post-1', 'post-2', 'post-3'];
            mockRepository.getAllPostIds.mockResolvedValue(postIds);
            mockRepository.syncReactionCounts
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error('Sync failed for post-2'))
                .mockResolvedValueOnce(undefined);
            await (0, globals_1.expect)(reactionService.syncAllReactionCounts()).rejects.toThrow('Sync failed for post-2');
            (0, globals_1.expect)(mockRepository.getAllPostIds).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockRepository.syncReactionCounts).toHaveBeenCalledTimes(3);
        });
        (0, globals_1.it)('should process very large number of posts efficiently', async () => {
            const postIds = Array.from({ length: 1000 }, (_, i) => `post-${i}`);
            mockRepository.getAllPostIds.mockResolvedValue(postIds);
            mockRepository.syncReactionCounts.mockResolvedValue(undefined);
            await reactionService.syncAllReactionCounts();
            (0, globals_1.expect)(mockRepository.syncReactionCounts).toHaveBeenCalledTimes(1000);
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Starting to sync reaction counts for 1000 posts');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 1 to 100');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 901 to 1000');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Reaction count sync completed');
        });
        (0, globals_1.it)('should handle single post scenario', async () => {
            const postIds = ['post-1'];
            mockRepository.getAllPostIds.mockResolvedValue(postIds);
            mockRepository.syncReactionCounts.mockResolvedValue(undefined);
            await reactionService.syncAllReactionCounts();
            (0, globals_1.expect)(mockRepository.syncReactionCounts).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(mockRepository.syncReactionCounts).toHaveBeenCalledWith('post-1');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Starting to sync reaction counts for 1 posts');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 1 to 1');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Reaction count sync completed');
        });
    });
    (0, globals_1.describe)('Edge Cases and Integration Scenarios', () => {
        (0, globals_1.it)('should handle concurrent createReaction calls for same user and post', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.LIKE;
            const existingReaction = createMockReaction({ userId, postId, type });
            mockRepository.getByPostIdAndUserId.mockResolvedValue(existingReaction);
            const [result1, result2] = await Promise.all([
                reactionService.createReaction(userId, postId, type),
                reactionService.createReaction(userId, postId, type)
            ]);
            (0, globals_1.expect)(result1).toEqual(existingReaction);
            (0, globals_1.expect)(result2).toEqual(existingReaction);
            (0, globals_1.expect)(mockRepository.create).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle different reaction types for same user and post', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const likeReaction = createMockReaction({ userId, postId, type: dto_1.ReactionType.LIKE });
            const retweetReaction = createMockReaction({ userId, postId, type: dto_1.ReactionType.RETWEET });
            mockRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockRepository.create
                .mockResolvedValueOnce(likeReaction)
                .mockResolvedValueOnce(retweetReaction);
            const [likeResult, retweetResult] = await Promise.all([
                reactionService.createReaction(userId, postId, dto_1.ReactionType.LIKE),
                reactionService.createReaction(userId, postId, dto_1.ReactionType.RETWEET)
            ]);
            (0, globals_1.expect)(likeResult.type).toBe(dto_1.ReactionType.LIKE);
            (0, globals_1.expect)(retweetResult.type).toBe(dto_1.ReactionType.RETWEET);
            (0, globals_1.expect)(mockRepository.create).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should handle mixed operations on same post', async () => {
            const userId1 = 'user-1';
            const userId2 = 'user-2';
            const postId = 'post-1';
            const type = dto_1.ReactionType.LIKE;
            mockRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue(createMockReaction({ userId: userId1, postId, type }));
            mockRepository.delete.mockResolvedValue(undefined);
            mockRepository.getCountByPostId
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(0);
            const [createResult, , countsResult] = await Promise.all([
                reactionService.createReaction(userId1, postId, type),
                reactionService.deleteReaction(userId2, postId, type),
                reactionService.getReactionCountsForPost(postId)
            ]);
            (0, globals_1.expect)(createResult).toBeDefined();
            (0, globals_1.expect)(countsResult).toEqual({ likes: 1, retweets: 0 });
            (0, globals_1.expect)(mockRepository.create).toHaveBeenCalledWith(userId1, postId, type);
            (0, globals_1.expect)(mockRepository.delete).toHaveBeenCalledWith(userId2, postId, type);
        });
        (0, globals_1.it)('should handle null/undefined repository responses gracefully', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const type = dto_1.ReactionType.LIKE;
            mockRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue(createMockReaction({ userId, postId, type }));
            const result = await reactionService.createReaction(userId, postId, type);
            (0, globals_1.expect)(result).toBeDefined();
            const hasReacted = await reactionService.hasUserReacted(userId, postId, type);
            (0, globals_1.expect)(hasReacted).toBe(false);
        });
        (0, globals_1.it)('should maintain consistent behavior across all reaction types', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const reactionTypes = [dto_1.ReactionType.LIKE, dto_1.ReactionType.RETWEET];
            for (const type of reactionTypes) {
                mockRepository.getByPostIdAndUserId.mockResolvedValue(null);
                mockRepository.create.mockResolvedValue(createMockReaction({ userId, postId, type }));
                const result = await reactionService.createReaction(userId, postId, type);
                (0, globals_1.expect)(result.type).toBe(type);
                (0, globals_1.expect)(mockRepository.create).toHaveBeenCalledWith(userId, postId, type);
            }
        });
        (0, globals_1.it)('should handle very long user and post IDs', async () => {
            const longUserId = 'a'.repeat(1000);
            const longPostId = 'b'.repeat(1000);
            const type = dto_1.ReactionType.LIKE;
            const reaction = createMockReaction({ userId: longUserId, postId: longPostId, type });
            mockRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue(reaction);
            const result = await reactionService.createReaction(longUserId, longPostId, type);
            (0, globals_1.expect)(result).toEqual(reaction);
            (0, globals_1.expect)(mockRepository.create).toHaveBeenCalledWith(longUserId, longPostId, type);
        });
    });
    (0, globals_1.describe)('Performance and Scalability', () => {
        (0, globals_1.beforeEach)(() => {
            globals_1.jest.spyOn(console, 'log').mockImplementation(() => { });
        });
        (0, globals_1.afterEach)(() => {
            ;
            console.log.mockRestore();
        });
        (0, globals_1.it)('should handle batch processing in syncAllReactionCounts efficiently', async () => {
            const largePostIds = Array.from({ length: 500 }, (_, i) => `post-${i}`);
            mockRepository.getAllPostIds.mockResolvedValue(largePostIds);
            mockRepository.syncReactionCounts.mockResolvedValue(undefined);
            const startTime = Date.now();
            await reactionService.syncAllReactionCounts();
            const endTime = Date.now();
            (0, globals_1.expect)(mockRepository.syncReactionCounts).toHaveBeenCalledTimes(500);
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Starting to sync reaction counts for 500 posts');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 1 to 100');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 401 to 500');
            (0, globals_1.expect)(console.log).toHaveBeenCalledWith('Reaction count sync completed');
            (0, globals_1.expect)(endTime - startTime).toBeLessThan(5000);
        });
        (0, globals_1.it)('should handle concurrent user reaction queries efficiently', async () => {
            const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`);
            const type = dto_1.ReactionType.LIKE;
            mockRepository.getByUserId.mockResolvedValue([createMockReaction({ type })]);
            const results = await Promise.all(userIds.map(userId => reactionService.getUserReactions(userId, type)));
            (0, globals_1.expect)(results).toHaveLength(10);
            (0, globals_1.expect)(mockRepository.getByUserId).toHaveBeenCalledTimes(10);
            userIds.forEach(userId => {
                (0, globals_1.expect)(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type);
            });
        });
        (0, globals_1.it)('should handle concurrent reaction count queries for multiple posts', async () => {
            const postIds = Array.from({ length: 5 }, (_, i) => `post-${i}`);
            mockRepository.getCountByPostId.mockResolvedValue(10);
            const results = await Promise.all(postIds.map(postId => reactionService.getReactionCountsForPost(postId)));
            (0, globals_1.expect)(results).toHaveLength(5);
            (0, globals_1.expect)(mockRepository.getCountByPostId).toHaveBeenCalledTimes(10);
            results.forEach(result => {
                (0, globals_1.expect)(result).toEqual({ likes: 10, retweets: 10 });
            });
        });
    });
});
//# sourceMappingURL=reaction.service.impl.test.js.map