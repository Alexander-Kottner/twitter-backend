import { FollowerServiceImpl } from './follower.service.impl'
import { FollowerRepository } from '../repository'
import { FollowDTO } from '../dto'
import { BadRequestException, NotFoundException } from '@utils/errors'
import { describe, it, beforeEach, expect, jest } from '@jest/globals'

// Mock dependencies
jest.mock('@utils/errors', () => ({
  BadRequestException: jest.fn().mockImplementation((message: unknown) => {
    const error = new Error(String(message))
    error.name = 'BadRequestException'
    return error
  }),
  NotFoundException: jest.fn().mockImplementation((message: unknown) => {
    const error = new Error(String(message))
    error.name = 'NotFoundException'
    return error
  })
}))

describe('FollowerServiceImpl', () => {
  let followerService: FollowerServiceImpl
  let mockRepository: jest.Mocked<FollowerRepository>

  // Test data factory
  const createMockFollow = (overrides: Partial<FollowDTO> = {}): FollowDTO => ({
    id: 'follow-1',
    followerId: 'user-1',
    followedId: 'user-2',
    createdAt: new Date(),
    ...overrides
  })

  beforeEach(() => {
    // Create mocked repository
    mockRepository = {
      follow: jest.fn(),
      unfollow: jest.fn(),
      isFollowing: jest.fn()
    } as jest.Mocked<FollowerRepository>

    // Reset all mocks
    jest.clearAllMocks()

    // Create service instance
    followerService = new FollowerServiceImpl(mockRepository)
  })

  describe('followUser', () => {
    it('should successfully follow a user when all conditions are met', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId = 'user-2'
      const expectedFollow = createMockFollow({ followerId, followedId })

      mockRepository.isFollowing.mockResolvedValue(false)
      mockRepository.follow.mockResolvedValue(expectedFollow)

      // Act
      const result = await followerService.followUser(followerId, followedId)

      // Assert
      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId)
      expect(result).toEqual(expectedFollow)
    })

    it('should throw BadRequestException when user tries to follow themselves', async () => {
      // Arrange
      const userId = 'user-1'

      // Act & Assert
      await expect(followerService.followUser(userId, userId)).rejects.toThrow('No puedes seguirte a ti mismo')

      // Verify that repository methods are not called
      expect(mockRepository.isFollowing).not.toHaveBeenCalled()
      expect(mockRepository.follow).not.toHaveBeenCalled()
    })

    it('should throw BadRequestException when user is already following the target user', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId = 'user-2'

      mockRepository.isFollowing.mockResolvedValue(true)

      // Act & Assert
      await expect(followerService.followUser(followerId, followedId)).rejects.toThrow('Ya sigues a este usuario')

      // Verify that follow is not called
      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.follow).not.toHaveBeenCalled()
    })

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId = 'user-2'
      const repositoryError = new Error('Database connection failed')

      mockRepository.isFollowing.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(followerService.followUser(followerId, followedId)).rejects.toThrow('Database connection failed')

      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.follow).not.toHaveBeenCalled()
    })

    it('should handle repository follow operation errors', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId = 'user-2'
      const repositoryError = new Error('Failed to create follow relationship')

      mockRepository.isFollowing.mockResolvedValue(false)
      mockRepository.follow.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(followerService.followUser(followerId, followedId)).rejects.toThrow('Failed to create follow relationship')

      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId)
    })

    it('should handle empty string user IDs', async () => {
      // Arrange
      const followerId = ''
      const followedId = 'user-2'
      const expectedFollow = createMockFollow({ followerId, followedId })

      mockRepository.isFollowing.mockResolvedValue(false)
      mockRepository.follow.mockResolvedValue(expectedFollow)

      // Act
      const result = await followerService.followUser(followerId, followedId)

      // Assert
      expect(result).toEqual(expectedFollow)
      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId)
    })

    it('should handle special characters in user IDs', async () => {
      // Arrange
      const followerId = 'user-with-special-chars-@#$'
      const followedId = 'user-with-números-123'
      const expectedFollow = createMockFollow({ followerId, followedId })

      mockRepository.isFollowing.mockResolvedValue(false)
      mockRepository.follow.mockResolvedValue(expectedFollow)

      // Act
      const result = await followerService.followUser(followerId, followedId)

      // Assert
      expect(result).toEqual(expectedFollow)
      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId)
    })
  })

  describe('unfollowUser', () => {
    it('should successfully unfollow a user when currently following', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId = 'user-2'

      mockRepository.isFollowing.mockResolvedValue(true)
      mockRepository.unfollow.mockResolvedValue(undefined)

      // Act
      await followerService.unfollowUser(followerId, followedId)

      // Assert
      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId)
    })

    it('should throw BadRequestException when user tries to unfollow themselves', async () => {
      // Arrange
      const userId = 'user-1'

      // Act & Assert
      await expect(followerService.unfollowUser(userId, userId)).rejects.toThrow('No puedes dejar de seguirte a ti mismo')

      // Verify that repository methods are not called
      expect(mockRepository.isFollowing).not.toHaveBeenCalled()
      expect(mockRepository.unfollow).not.toHaveBeenCalled()
    })

    it('should throw NotFoundException when user is not following the target user', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId = 'user-2'

      mockRepository.isFollowing.mockResolvedValue(false)

      // Act & Assert
      await expect(followerService.unfollowUser(followerId, followedId)).rejects.toThrow('No sigues a este usuario')

      // Verify that unfollow is not called
      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.unfollow).not.toHaveBeenCalled()
    })

    it('should handle repository errors during follow check gracefully', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId = 'user-2'
      const repositoryError = new Error('Database connection failed')

      mockRepository.isFollowing.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(followerService.unfollowUser(followerId, followedId)).rejects.toThrow('Database connection failed')

      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.unfollow).not.toHaveBeenCalled()
    })

    it('should handle repository errors during unfollow operation gracefully', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId = 'user-2'
      const repositoryError = new Error('Failed to delete follow relationship')

      mockRepository.isFollowing.mockResolvedValue(true)
      mockRepository.unfollow.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(followerService.unfollowUser(followerId, followedId)).rejects.toThrow('Failed to delete follow relationship')

      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId)
    })

    it('should handle empty string user IDs', async () => {
      // Arrange
      const followerId = ''
      const followedId = 'user-2'

      mockRepository.isFollowing.mockResolvedValue(true)
      mockRepository.unfollow.mockResolvedValue(undefined)

      // Act
      await followerService.unfollowUser(followerId, followedId)

      // Assert
      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId)
    })

    it('should handle special characters in user IDs', async () => {
      // Arrange
      const followerId = 'user-with-special-chars-@#$'
      const followedId = 'user-with-números-123'

      mockRepository.isFollowing.mockResolvedValue(true)
      mockRepository.unfollow.mockResolvedValue(undefined)

      // Act
      await followerService.unfollowUser(followerId, followedId)

      // Assert
      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId)
    })
  })

  describe('Edge Cases and Integration Scenarios', () => {
    it('should handle concurrent follow operations correctly', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId1 = 'user-2'
      const followedId2 = 'user-3'
      const expectedFollow1 = createMockFollow({ followerId, followedId: followedId1 })
      const expectedFollow2 = createMockFollow({ followerId, followedId: followedId2 })

      mockRepository.isFollowing.mockResolvedValue(false)
      mockRepository.follow
        .mockResolvedValueOnce(expectedFollow1)
        .mockResolvedValueOnce(expectedFollow2)

      // Act
      const [result1, result2] = await Promise.all([
        followerService.followUser(followerId, followedId1),
        followerService.followUser(followerId, followedId2)
      ])

      // Assert
      expect(result1).toEqual(expectedFollow1)
      expect(result2).toEqual(expectedFollow2)
      expect(mockRepository.isFollowing).toHaveBeenCalledTimes(2)
      expect(mockRepository.follow).toHaveBeenCalledTimes(2)
    })

    it('should handle concurrent unfollow operations correctly', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId1 = 'user-2'
      const followedId2 = 'user-3'

      mockRepository.isFollowing.mockResolvedValue(true)
      mockRepository.unfollow.mockResolvedValue(undefined)

      // Act
      await Promise.all([
        followerService.unfollowUser(followerId, followedId1),
        followerService.unfollowUser(followerId, followedId2)
      ])

      // Assert
      expect(mockRepository.isFollowing).toHaveBeenCalledTimes(2)
      expect(mockRepository.unfollow).toHaveBeenCalledTimes(2)
      expect(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId1)
      expect(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId2)
    })

    it('should handle mixed follow/unfollow operations', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId1 = 'user-2'
      const followedId2 = 'user-3'
      const expectedFollow = createMockFollow({ followerId, followedId: followedId1 })

      mockRepository.isFollowing
        .mockResolvedValueOnce(false) // For follow operation
        .mockResolvedValueOnce(true)  // For unfollow operation
      mockRepository.follow.mockResolvedValue(expectedFollow)
      mockRepository.unfollow.mockResolvedValue(undefined)

      // Act
      const [followResult] = await Promise.all([
        followerService.followUser(followerId, followedId1),
        followerService.unfollowUser(followerId, followedId2)
      ])

      // Assert
      expect(followResult).toEqual(expectedFollow)
      expect(mockRepository.isFollowing).toHaveBeenCalledTimes(2)
      expect(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId1)
      expect(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId2)
    })

    it('should handle very long user IDs', async () => {
      // Arrange
      const longUserId1 = 'a'.repeat(1000)
      const longUserId2 = 'b'.repeat(1000)
      const expectedFollow = createMockFollow({ followerId: longUserId1, followedId: longUserId2 })

      mockRepository.isFollowing.mockResolvedValue(false)
      mockRepository.follow.mockResolvedValue(expectedFollow)

      // Act
      const result = await followerService.followUser(longUserId1, longUserId2)

      // Assert
      expect(result).toEqual(expectedFollow)
      expect(mockRepository.isFollowing).toHaveBeenCalledWith(longUserId1, longUserId2)
      expect(mockRepository.follow).toHaveBeenCalledWith(longUserId1, longUserId2)
    })

    it('should handle null/undefined repository responses gracefully', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId = 'user-2'

      // Test when repository.isFollowing returns null/undefined (should be treated as false)
      mockRepository.isFollowing.mockResolvedValue(null as any)
      mockRepository.follow.mockResolvedValue(createMockFollow({ followerId, followedId }))

      // Act & Assert - should not throw error
      const result = await followerService.followUser(followerId, followedId)
      expect(result).toBeDefined()
    })

    it('should maintain consistent state during error recovery scenarios', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId = 'user-2'

      // First call fails
      mockRepository.isFollowing.mockRejectedValueOnce(new Error('Temporary database error'))
      
      // Second call succeeds
      mockRepository.isFollowing.mockResolvedValueOnce(false)
      mockRepository.follow.mockResolvedValueOnce(createMockFollow({ followerId, followedId }))

      // Act & Assert
      // First call should fail
      await expect(followerService.followUser(followerId, followedId)).rejects.toThrow('Temporary database error')
      
      // Second call should succeed
      const result = await followerService.followUser(followerId, followedId)
      expect(result).toBeDefined()
      expect(mockRepository.isFollowing).toHaveBeenCalledTimes(2)
    })
  })

  describe('Business Logic Validation', () => {
    it('should ensure follow operation creates correct relationship direction', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId = 'user-2'
      const expectedFollow = createMockFollow({ followerId, followedId })

      mockRepository.isFollowing.mockResolvedValue(false)
      mockRepository.follow.mockResolvedValue(expectedFollow)

      // Act
      const result = await followerService.followUser(followerId, followedId)

      // Assert
      expect(result.followerId).toBe(followerId)
      expect(result.followedId).toBe(followedId)
      expect(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId)
    })

    it('should ensure unfollow operation targets correct relationship direction', async () => {
      // Arrange
      const followerId = 'user-1'
      const followedId = 'user-2'

      mockRepository.isFollowing.mockResolvedValue(true)
      mockRepository.unfollow.mockResolvedValue(undefined)

      // Act
      await followerService.unfollowUser(followerId, followedId)

      // Assert
      expect(mockRepository.isFollowing).toHaveBeenCalledWith(followerId, followedId)
      expect(mockRepository.unfollow).toHaveBeenCalledWith(followerId, followedId)
    })

    it('should validate that identical user IDs are rejected for both operations', async () => {
      // Arrange
      const userId = 'same-user-id'

      // Act & Assert for follow
      await expect(followerService.followUser(userId, userId)).rejects.toThrow('No puedes seguirte a ti mismo')

      // Act & Assert for unfollow
      await expect(followerService.unfollowUser(userId, userId)).rejects.toThrow('No puedes dejar de seguirte a ti mismo')

      // Ensure no repository calls were made
      expect(mockRepository.isFollowing).not.toHaveBeenCalled()
      expect(mockRepository.follow).not.toHaveBeenCalled()
      expect(mockRepository.unfollow).not.toHaveBeenCalled()
    })

    it('should handle case sensitivity in user ID comparisons', async () => {
      // Arrange
      const followerId = 'User-1'
      const followedId = 'user-1' // Different case but conceptually same user
      const expectedFollow = createMockFollow({ followerId, followedId })

      mockRepository.isFollowing.mockResolvedValue(false)
      mockRepository.follow.mockResolvedValue(expectedFollow)

      // Act - this should NOT be rejected as they are different strings
      const result = await followerService.followUser(followerId, followedId)

      // Assert - case sensitive comparison means this is allowed
      expect(result).toEqual(expectedFollow)
      expect(mockRepository.follow).toHaveBeenCalledWith(followerId, followedId)
    })
  })

  describe('Error Message Localization', () => {
    it('should return Spanish error messages for self-follow attempts', async () => {
      // Arrange & Act & Assert
      await expect(followerService.followUser('user-1', 'user-1'))
        .rejects.toThrow('No puedes seguirte a ti mismo')
    })

    it('should return Spanish error messages for already following', async () => {
      // Arrange
      mockRepository.isFollowing.mockResolvedValue(true)

      // Act & Assert
      await expect(followerService.followUser('user-1', 'user-2'))
        .rejects.toThrow('Ya sigues a este usuario')
    })

    it('should return Spanish error messages for self-unfollow attempts', async () => {
      // Arrange & Act & Assert
      await expect(followerService.unfollowUser('user-1', 'user-1'))
        .rejects.toThrow('No puedes dejar de seguirte a ti mismo')
    })

    it('should return Spanish error messages for not following', async () => {
      // Arrange
      mockRepository.isFollowing.mockResolvedValue(false)

      // Act & Assert
      await expect(followerService.unfollowUser('user-1', 'user-2'))
        .rejects.toThrow('No sigues a este usuario')
    })
  })
})