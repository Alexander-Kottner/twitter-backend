"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const follower_service_impl_1 = require("./follower.service.impl");
const globals_1 = require("@jest/globals");
globals_1.jest.mock('@utils/errors', () => ({
    BadRequestException: globals_1.jest.fn().mockImplementation((message) => {
        const error = new Error(String(message));
        error.name = 'BadRequestException';
        return error;
    }),
    NotFoundException: globals_1.jest.fn().mockImplementation((message) => {
        const error = new Error(String(message));
        error.name = 'NotFoundException';
        return error;
    })
}));
(0, globals_1.describe)('FollowerServiceImpl', () => {
    let followerService;
    let mockRepository;
    const createMockFollow = (overrides = {}) => ({
        id: 'follow-1',
        followerId: 'user-1',
        followedId: 'user-2',
        createdAt: new Date(),
        ...overrides
    });
    (0, globals_1.beforeEach)(() => {
        mockRepository = {
            follow: globals_1.jest.fn(),
            unfollow: globals_1.jest.fn(),
            isFollowing: globals_1.jest.fn()
        };
        globals_1.jest.clearAllMocks();
        followerService = new follower_service_impl_1.FollowerServiceImpl(mockRepository);
    });
    (0, globals_1.describe)('followUser', () => {
        (0, globals_1.it)('should successfully follow a user when all conditions are met', async () => {
            const followerId = 'user-1';
            const followedId = 'user-2';
            const expectedFollow = createMockFollow({ followerId, followedId });
            mockRepository.isFollowing.mockResolvedValue(false);
            mockRepository.follow.mockResolvedValue(expectedFollow);
            const result = await followerService.followUser(followerId, followedId);
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(result).toEqual(expectedFollow);
        });
        (0, globals_1.it)('should throw BadRequestException when user tries to follow themselves', async () => {
            const userId = 'user-1';
            await (0, globals_1.expect)(followerService.followUser(userId, userId)).rejects.toThrow('No puedes seguirte a ti mismo');
            (0, globals_1.expect)(mockRepository.isFollowing).not.toHaveBeenCalled();
            (0, globals_1.expect)(mockRepository.follow).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw BadRequestException when user is already following the target user', async () => {
            const followerId = 'user-1';
            const followedId = 'user-2';
            mockRepository.isFollowing.mockResolvedValue(true);
            await (0, globals_1.expect)(followerService.followUser(followerId, followedId)).rejects.toThrow('Ya sigues a este usuario');
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.follow).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle repository errors gracefully', async () => {
            const followerId = 'user-1';
            const followedId = 'user-2';
            const repositoryError = new Error('Database connection failed');
            mockRepository.isFollowing.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(followerService.followUser(followerId, followedId)).rejects.toThrow('Database connection failed');
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.follow).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle repository follow operation errors', async () => {
            const followerId = 'user-1';
            const followedId = 'user-2';
            const repositoryError = new Error('Failed to create follow relationship');
            mockRepository.isFollowing.mockResolvedValue(false);
            mockRepository.follow.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(followerService.followUser(followerId, followedId)).rejects.toThrow('Failed to create follow relationship');
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId);
        });
        (0, globals_1.it)('should handle empty string user IDs', async () => {
            const followerId = '';
            const followedId = 'user-2';
            const expectedFollow = createMockFollow({ followerId, followedId });
            mockRepository.isFollowing.mockResolvedValue(false);
            mockRepository.follow.mockResolvedValue(expectedFollow);
            const result = await followerService.followUser(followerId, followedId);
            (0, globals_1.expect)(result).toEqual(expectedFollow);
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId);
        });
        (0, globals_1.it)('should handle special characters in user IDs', async () => {
            const followerId = 'user-with-special-chars-@#$';
            const followedId = 'user-with-números-123';
            const expectedFollow = createMockFollow({ followerId, followedId });
            mockRepository.isFollowing.mockResolvedValue(false);
            mockRepository.follow.mockResolvedValue(expectedFollow);
            const result = await followerService.followUser(followerId, followedId);
            (0, globals_1.expect)(result).toEqual(expectedFollow);
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId);
        });
    });
    (0, globals_1.describe)('unfollowUser', () => {
        (0, globals_1.it)('should successfully unfollow a user when currently following', async () => {
            const followerId = 'user-1';
            const followedId = 'user-2';
            mockRepository.isFollowing.mockResolvedValue(true);
            mockRepository.unfollow.mockResolvedValue(undefined);
            await followerService.unfollowUser(followerId, followedId);
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId);
        });
        (0, globals_1.it)('should throw BadRequestException when user tries to unfollow themselves', async () => {
            const userId = 'user-1';
            await (0, globals_1.expect)(followerService.unfollowUser(userId, userId)).rejects.toThrow('No puedes dejar de seguirte a ti mismo');
            (0, globals_1.expect)(mockRepository.isFollowing).not.toHaveBeenCalled();
            (0, globals_1.expect)(mockRepository.unfollow).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw NotFoundException when user is not following the target user', async () => {
            const followerId = 'user-1';
            const followedId = 'user-2';
            mockRepository.isFollowing.mockResolvedValue(false);
            await (0, globals_1.expect)(followerService.unfollowUser(followerId, followedId)).rejects.toThrow('No sigues a este usuario');
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.unfollow).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle repository errors during follow check gracefully', async () => {
            const followerId = 'user-1';
            const followedId = 'user-2';
            const repositoryError = new Error('Database connection failed');
            mockRepository.isFollowing.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(followerService.unfollowUser(followerId, followedId)).rejects.toThrow('Database connection failed');
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.unfollow).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle repository errors during unfollow operation gracefully', async () => {
            const followerId = 'user-1';
            const followedId = 'user-2';
            const repositoryError = new Error('Failed to delete follow relationship');
            mockRepository.isFollowing.mockResolvedValue(true);
            mockRepository.unfollow.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(followerService.unfollowUser(followerId, followedId)).rejects.toThrow('Failed to delete follow relationship');
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId);
        });
        (0, globals_1.it)('should handle empty string user IDs', async () => {
            const followerId = '';
            const followedId = 'user-2';
            mockRepository.isFollowing.mockResolvedValue(true);
            mockRepository.unfollow.mockResolvedValue(undefined);
            await followerService.unfollowUser(followerId, followedId);
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId);
        });
        (0, globals_1.it)('should handle special characters in user IDs', async () => {
            const followerId = 'user-with-special-chars-@#$';
            const followedId = 'user-with-números-123';
            mockRepository.isFollowing.mockResolvedValue(true);
            mockRepository.unfollow.mockResolvedValue(undefined);
            await followerService.unfollowUser(followerId, followedId);
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId);
        });
    });
    (0, globals_1.describe)('Edge Cases and Integration Scenarios', () => {
        (0, globals_1.it)('should handle concurrent follow operations correctly', async () => {
            const followerId = 'user-1';
            const followedId1 = 'user-2';
            const followedId2 = 'user-3';
            const expectedFollow1 = createMockFollow({ followerId, followedId: followedId1 });
            const expectedFollow2 = createMockFollow({ followerId, followedId: followedId2 });
            mockRepository.isFollowing.mockResolvedValue(false);
            mockRepository.follow
                .mockResolvedValueOnce(expectedFollow1)
                .mockResolvedValueOnce(expectedFollow2);
            const [result1, result2] = await Promise.all([
                followerService.followUser(followerId, followedId1),
                followerService.followUser(followerId, followedId2)
            ]);
            (0, globals_1.expect)(result1).toEqual(expectedFollow1);
            (0, globals_1.expect)(result2).toEqual(expectedFollow2);
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(mockRepository.follow).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should handle concurrent unfollow operations correctly', async () => {
            const followerId = 'user-1';
            const followedId1 = 'user-2';
            const followedId2 = 'user-3';
            mockRepository.isFollowing.mockResolvedValue(true);
            mockRepository.unfollow.mockResolvedValue(undefined);
            await Promise.all([
                followerService.unfollowUser(followerId, followedId1),
                followerService.unfollowUser(followerId, followedId2)
            ]);
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(mockRepository.unfollow).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId1);
            (0, globals_1.expect)(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId2);
        });
        (0, globals_1.it)('should handle mixed follow/unfollow operations', async () => {
            const followerId = 'user-1';
            const followedId1 = 'user-2';
            const followedId2 = 'user-3';
            const expectedFollow = createMockFollow({ followerId, followedId: followedId1 });
            mockRepository.isFollowing
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);
            mockRepository.follow.mockResolvedValue(expectedFollow);
            mockRepository.unfollow.mockResolvedValue(undefined);
            const [followResult] = await Promise.all([
                followerService.followUser(followerId, followedId1),
                followerService.unfollowUser(followerId, followedId2)
            ]);
            (0, globals_1.expect)(followResult).toEqual(expectedFollow);
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId1);
            (0, globals_1.expect)(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId2);
        });
        (0, globals_1.it)('should handle very long user IDs', async () => {
            const longUserId1 = 'a'.repeat(1000);
            const longUserId2 = 'b'.repeat(1000);
            const expectedFollow = createMockFollow({ followerId: longUserId1, followedId: longUserId2 });
            mockRepository.isFollowing.mockResolvedValue(false);
            mockRepository.follow.mockResolvedValue(expectedFollow);
            const result = await followerService.followUser(longUserId1, longUserId2);
            (0, globals_1.expect)(result).toEqual(expectedFollow);
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(longUserId1, longUserId2);
            (0, globals_1.expect)(mockRepository.follow).toHaveBeenCalledWith(longUserId1, longUserId2);
        });
        (0, globals_1.it)('should handle null/undefined repository responses gracefully', async () => {
            const followerId = 'user-1';
            const followedId = 'user-2';
            mockRepository.isFollowing.mockResolvedValue(null);
            mockRepository.follow.mockResolvedValue(createMockFollow({ followerId, followedId }));
            const result = await followerService.followUser(followerId, followedId);
            (0, globals_1.expect)(result).toBeDefined();
        });
        (0, globals_1.it)('should maintain consistent state during error recovery scenarios', async () => {
            const followerId = 'user-1';
            const followedId = 'user-2';
            mockRepository.isFollowing.mockRejectedValueOnce(new Error('Temporary database error'));
            mockRepository.isFollowing.mockResolvedValueOnce(false);
            mockRepository.follow.mockResolvedValueOnce(createMockFollow({ followerId, followedId }));
            await (0, globals_1.expect)(followerService.followUser(followerId, followedId)).rejects.toThrow('Temporary database error');
            const result = await followerService.followUser(followerId, followedId);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledTimes(2);
        });
    });
    (0, globals_1.describe)('Business Logic Validation', () => {
        (0, globals_1.it)('should ensure follow operation creates correct relationship direction', async () => {
            const followerId = 'user-1';
            const followedId = 'user-2';
            const expectedFollow = createMockFollow({ followerId, followedId });
            mockRepository.isFollowing.mockResolvedValue(false);
            mockRepository.follow.mockResolvedValue(expectedFollow);
            const result = await followerService.followUser(followerId, followedId);
            (0, globals_1.expect)(result.followerId).toBe(followerId);
            (0, globals_1.expect)(result.followedId).toBe(followedId);
            (0, globals_1.expect)(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId);
        });
        (0, globals_1.it)('should ensure unfollow operation targets correct relationship direction', async () => {
            const followerId = 'user-1';
            const followedId = 'user-2';
            mockRepository.isFollowing.mockResolvedValue(true);
            mockRepository.unfollow.mockResolvedValue(undefined);
            await followerService.unfollowUser(followerId, followedId);
            (0, globals_1.expect)(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId);
            (0, globals_1.expect)(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId);
        });
        (0, globals_1.it)('should validate that identical user IDs are rejected for both operations', async () => {
            const userId = 'same-user-id';
            await (0, globals_1.expect)(followerService.followUser(userId, userId)).rejects.toThrow('No puedes seguirte a ti mismo');
            await (0, globals_1.expect)(followerService.unfollowUser(userId, userId)).rejects.toThrow('No puedes dejar de seguirte a ti mismo');
            (0, globals_1.expect)(mockRepository.isFollowing).not.toHaveBeenCalled();
            (0, globals_1.expect)(mockRepository.follow).not.toHaveBeenCalled();
            (0, globals_1.expect)(mockRepository.unfollow).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle case sensitivity in user ID comparisons', async () => {
            const followerId = 'User-1';
            const followedId = 'user-1';
            const expectedFollow = createMockFollow({ followerId, followedId });
            mockRepository.isFollowing.mockResolvedValue(false);
            mockRepository.follow.mockResolvedValue(expectedFollow);
            const result = await followerService.followUser(followerId, followedId);
            (0, globals_1.expect)(result).toEqual(expectedFollow);
            (0, globals_1.expect)(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId);
        });
    });
    (0, globals_1.describe)('Error Message Localization', () => {
        (0, globals_1.it)('should return Spanish error messages for self-follow attempts', async () => {
            await (0, globals_1.expect)(followerService.followUser('user-1', 'user-1'))
                .rejects.toThrow('No puedes seguirte a ti mismo');
        });
        (0, globals_1.it)('should return Spanish error messages for already following', async () => {
            mockRepository.isFollowing.mockResolvedValue(true);
            await (0, globals_1.expect)(followerService.followUser('user-1', 'user-2'))
                .rejects.toThrow('Ya sigues a este usuario');
        });
        (0, globals_1.it)('should return Spanish error messages for self-unfollow attempts', async () => {
            await (0, globals_1.expect)(followerService.unfollowUser('user-1', 'user-1'))
                .rejects.toThrow('No puedes dejar de seguirte a ti mismo');
        });
        (0, globals_1.it)('should return Spanish error messages for not following', async () => {
            mockRepository.isFollowing.mockResolvedValue(false);
            await (0, globals_1.expect)(followerService.unfollowUser('user-1', 'user-2'))
                .rejects.toThrow('No sigues a este usuario');
        });
    });
});
//# sourceMappingURL=follower.service.impl.test.js.map