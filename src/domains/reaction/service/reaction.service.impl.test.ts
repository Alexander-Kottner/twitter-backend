import { ReactionServiceImpl } from './reaction.service.impl'
import { ReactionRepository } from '../repository'
import { ReactionDTO, ReactionType } from '../dto'
import { describe, it, beforeEach, expect, jest, afterEach } from '@jest/globals'

describe('ReactionServiceImpl', () => {
  let reactionService: ReactionServiceImpl
  let mockRepository: jest.Mocked<ReactionRepository>

  // Test data factory
  const createMockReaction = (overrides: Partial<ReactionDTO> = {}): ReactionDTO => ({
    id: 'reaction-1',
    userId: 'user-1',
    postId: 'post-1',
    type: ReactionType.LIKE,
    createdAt: new Date(),
    ...overrides
  })

  beforeEach(() => {
    // Create mocked repository
    mockRepository = {
      create: jest.fn(),
      delete: jest.fn(),
      getByPostIdAndUserId: jest.fn(),
      getCountByPostId: jest.fn(),
      getByUserId: jest.fn(),
      syncReactionCounts: jest.fn(),
      getAllPostIds: jest.fn()
    } as jest.Mocked<ReactionRepository>

    // Reset all mocks
    jest.clearAllMocks()

    // Create service instance
    reactionService = new ReactionServiceImpl(mockRepository)
  })

  describe('createReaction', () => {
    it('should return existing reaction when user has already reacted', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.LIKE
      const existingReaction = createMockReaction({ userId, postId, type })

      mockRepository.getByPostIdAndUserId.mockResolvedValue(existingReaction)

      // Act
      const result = await reactionService.createReaction(userId, postId, type)

      // Assert
      expect(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type)
      expect(mockRepository.create).not.toHaveBeenCalled()
      expect(result).toEqual(existingReaction)
    })

    it('should create new reaction when user has not reacted before', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.LIKE
      const newReaction = createMockReaction({ userId, postId, type })

      mockRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(newReaction)

      // Act
      const result = await reactionService.createReaction(userId, postId, type)

      // Assert
      expect(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type)
      expect(mockRepository.create).toHaveBeenCalledWith(userId, postId, type)
      expect(result).toEqual(newReaction)
    })

    it('should handle RETWEET type reactions correctly', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.RETWEET
      const retweetReaction = createMockReaction({ userId, postId, type })

      mockRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(retweetReaction)

      // Act
      const result = await reactionService.createReaction(userId, postId, type)

      // Assert
      expect(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type)
      expect(mockRepository.create).toHaveBeenCalledWith(userId, postId, type)
      expect(result.type).toBe(ReactionType.RETWEET)
    })

    it('should handle repository errors during existence check', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.LIKE
      const repositoryError = new Error('Database connection failed')

      mockRepository.getByPostIdAndUserId.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(reactionService.createReaction(userId, postId, type)).rejects.toThrow('Database connection failed')

      expect(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type)
      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('should handle repository errors during creation', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.LIKE
      const repositoryError = new Error('Failed to create reaction')

      mockRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockRepository.create.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(reactionService.createReaction(userId, postId, type)).rejects.toThrow('Failed to create reaction')

      expect(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type)
      expect(mockRepository.create).toHaveBeenCalledWith(userId, postId, type)
    })

    it('should handle empty string parameters', async () => {
      // Arrange
      const userId = ''
      const postId = ''
      const type = ReactionType.LIKE
      const reaction = createMockReaction({ userId, postId, type })

      mockRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(reaction)

      // Act
      const result = await reactionService.createReaction(userId, postId, type)

      // Assert
      expect(result).toEqual(reaction)
      expect(mockRepository.create).toHaveBeenCalledWith(userId, postId, type)
    })

    it('should handle special characters in user and post IDs', async () => {
      // Arrange
      const userId = 'user-with-special-chars-@#$'
      const postId = 'post-with-números-123'
      const type = ReactionType.LIKE
      const reaction = createMockReaction({ userId, postId, type })

      mockRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(reaction)

      // Act
      const result = await reactionService.createReaction(userId, postId, type)

      // Assert
      expect(result).toEqual(reaction)
      expect(mockRepository.create).toHaveBeenCalledWith(userId, postId, type)
    })
  })

  describe('deleteReaction', () => {
    it('should call repository delete with correct parameters', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.LIKE

      mockRepository.delete.mockResolvedValue(undefined)

      // Act
      await reactionService.deleteReaction(userId, postId, type)

      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(userId, postId, type)
    })

    it('should handle RETWEET deletion correctly', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.RETWEET

      mockRepository.delete.mockResolvedValue(undefined)

      // Act
      await reactionService.deleteReaction(userId, postId, type)

      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(userId, postId, type)
    })

    it('should handle repository errors during deletion', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.LIKE
      const repositoryError = new Error('Failed to delete reaction')

      mockRepository.delete.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(reactionService.deleteReaction(userId, postId, type)).rejects.toThrow('Failed to delete reaction')

      expect(mockRepository.delete).toHaveBeenCalledWith(userId, postId, type)
    })

    it('should handle empty string parameters', async () => {
      // Arrange
      const userId = ''
      const postId = ''
      const type = ReactionType.LIKE

      mockRepository.delete.mockResolvedValue(undefined)

      // Act
      await reactionService.deleteReaction(userId, postId, type)

      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(userId, postId, type)
    })

    it('should handle special characters in parameters', async () => {
      // Arrange
      const userId = 'user-with-special-chars-@#$'
      const postId = 'post-with-números-123'
      const type = ReactionType.RETWEET

      mockRepository.delete.mockResolvedValue(undefined)

      // Act
      await reactionService.deleteReaction(userId, postId, type)

      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(userId, postId, type)
    })
  })

  describe('getReactionCountsForPost', () => {
    it('should return correct like and retweet counts', async () => {
      // Arrange
      const postId = 'post-1'
      const expectedLikes = 42
      const expectedRetweets = 15

      mockRepository.getCountByPostId
        .mockResolvedValueOnce(expectedLikes)  // For LIKE
        .mockResolvedValueOnce(expectedRetweets) // For RETWEET

      // Act
      const result = await reactionService.getReactionCountsForPost(postId)

      // Assert
      expect(mockRepository.getCountByPostId).toHaveBeenCalledTimes(2)
      expect(mockRepository.getCountByPostId).toHaveBeenCalledWith(postId, ReactionType.LIKE)
      expect(mockRepository.getCountByPostId).toHaveBeenCalledWith(postId, ReactionType.RETWEET)
      expect(result).toEqual({ likes: expectedLikes, retweets: expectedRetweets })
    })

    it('should return zero counts when post has no reactions', async () => {
      // Arrange
      const postId = 'post-1'

      mockRepository.getCountByPostId
        .mockResolvedValueOnce(0)  // For LIKE
        .mockResolvedValueOnce(0)  // For RETWEET

      // Act
      const result = await reactionService.getReactionCountsForPost(postId)

      // Assert
      expect(result).toEqual({ likes: 0, retweets: 0 })
    })

    it('should handle repository errors during count retrieval', async () => {
      // Arrange
      const postId = 'post-1'
      const repositoryError = new Error('Database connection failed')

      mockRepository.getCountByPostId.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(reactionService.getReactionCountsForPost(postId)).rejects.toThrow('Database connection failed')

      expect(mockRepository.getCountByPostId).toHaveBeenCalledWith(postId, ReactionType.LIKE)
    })

    it('should handle partial repository failures', async () => {
      // Arrange
      const postId = 'post-1'
      const repositoryError = new Error('Retweet count query failed')

      mockRepository.getCountByPostId
        .mockResolvedValueOnce(42)  // LIKE succeeds
        .mockRejectedValueOnce(repositoryError) // RETWEET fails

      // Act & Assert
      await expect(reactionService.getReactionCountsForPost(postId)).rejects.toThrow('Retweet count query failed')

      expect(mockRepository.getCountByPostId).toHaveBeenCalledTimes(2)
    })

    it('should handle empty post ID', async () => {
      // Arrange
      const postId = ''

      mockRepository.getCountByPostId
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)

      // Act
      const result = await reactionService.getReactionCountsForPost(postId)

      // Assert
      expect(result).toEqual({ likes: 0, retweets: 0 })
      expect(mockRepository.getCountByPostId).toHaveBeenCalledWith(postId, ReactionType.LIKE)
      expect(mockRepository.getCountByPostId).toHaveBeenCalledWith(postId, ReactionType.RETWEET)
    })

    it('should handle very large count numbers', async () => {
      // Arrange
      const postId = 'post-1'
      const largeLikeCount = 999999999
      const largeRetweetCount = 888888888

      mockRepository.getCountByPostId
        .mockResolvedValueOnce(largeLikeCount)
        .mockResolvedValueOnce(largeRetweetCount)

      // Act
      const result = await reactionService.getReactionCountsForPost(postId)

      // Assert
      expect(result).toEqual({ likes: largeLikeCount, retweets: largeRetweetCount })
    })
  })

  describe('hasUserReacted', () => {
    it('should return true when user has reacted', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.LIKE
      const existingReaction = createMockReaction({ userId, postId, type })

      mockRepository.getByPostIdAndUserId.mockResolvedValue(existingReaction)

      // Act
      const result = await reactionService.hasUserReacted(userId, postId, type)

      // Assert
      expect(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type)
      expect(result).toBe(true)
    })

    it('should return false when user has not reacted', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.LIKE

      mockRepository.getByPostIdAndUserId.mockResolvedValue(null)

      // Act
      const result = await reactionService.hasUserReacted(userId, postId, type)

      // Assert
      expect(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type)
      expect(result).toBe(false)
    })

    it('should handle RETWEET type reactions correctly', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.RETWEET
      const retweetReaction = createMockReaction({ userId, postId, type })

      mockRepository.getByPostIdAndUserId.mockResolvedValue(retweetReaction)

      // Act
      const result = await reactionService.hasUserReacted(userId, postId, type)

      // Assert
      expect(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type)
      expect(result).toBe(true)
    })

    it('should handle repository errors during reaction check', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.LIKE
      const repositoryError = new Error('Database connection failed')

      mockRepository.getByPostIdAndUserId.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(reactionService.hasUserReacted(userId, postId, type)).rejects.toThrow('Database connection failed')

      expect(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type)
    })

    it('should handle empty string parameters', async () => {
      // Arrange
      const userId = ''
      const postId = ''
      const type = ReactionType.LIKE

      mockRepository.getByPostIdAndUserId.mockResolvedValue(null)

      // Act
      const result = await reactionService.hasUserReacted(userId, postId, type)

      // Assert
      expect(result).toBe(false)
      expect(mockRepository.getByPostIdAndUserId).toHaveBeenCalledWith(postId, userId, type)
    })
  })

  describe('getUserReactions', () => {
    it('should return user reactions for LIKE type', async () => {
      // Arrange
      const userId = 'user-1'
      const type = ReactionType.LIKE
      const userReactions = [
        createMockReaction({ userId, type, postId: 'post-1' }),
        createMockReaction({ userId, type, postId: 'post-2' })
      ]

      mockRepository.getByUserId.mockResolvedValue(userReactions)

      // Act
      const result = await reactionService.getUserReactions(userId, type)

      // Assert
      expect(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type)
      expect(result).toEqual(userReactions)
      expect(result).toHaveLength(2)
    })

    it('should return user reactions for RETWEET type', async () => {
      // Arrange
      const userId = 'user-1'
      const type = ReactionType.RETWEET
      const userRetweets = [
        createMockReaction({ userId, type, postId: 'post-1' }),
        createMockReaction({ userId, type, postId: 'post-3' })
      ]

      mockRepository.getByUserId.mockResolvedValue(userRetweets)

      // Act
      const result = await reactionService.getUserReactions(userId, type)

      // Assert
      expect(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type)
      expect(result).toEqual(userRetweets)
      expect(result.every(r => r.type === ReactionType.RETWEET)).toBe(true)
    })

    it('should return empty array when user has no reactions', async () => {
      // Arrange
      const userId = 'user-1'
      const type = ReactionType.LIKE

      mockRepository.getByUserId.mockResolvedValue([])

      // Act
      const result = await reactionService.getUserReactions(userId, type)

      // Assert
      expect(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type)
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should handle repository errors during user reactions retrieval', async () => {
      // Arrange
      const userId = 'user-1'
      const type = ReactionType.LIKE
      const repositoryError = new Error('Database connection failed')

      mockRepository.getByUserId.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(reactionService.getUserReactions(userId, type)).rejects.toThrow('Database connection failed')

      expect(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type)
    })

    it('should handle empty user ID', async () => {
      // Arrange
      const userId = ''
      const type = ReactionType.LIKE

      mockRepository.getByUserId.mockResolvedValue([])

      // Act
      const result = await reactionService.getUserReactions(userId, type)

      // Assert
      expect(result).toEqual([])
      expect(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type)
    })

    it('should handle large number of user reactions', async () => {
      // Arrange
      const userId = 'user-1'
      const type = ReactionType.LIKE
      const manyReactions = Array.from({ length: 1000 }, (_, index) =>
        createMockReaction({ userId, type, postId: `post-${index}` })
      )

      mockRepository.getByUserId.mockResolvedValue(manyReactions)

      // Act
      const result = await reactionService.getUserReactions(userId, type)

      // Assert
      expect(result).toHaveLength(1000)
      expect(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type)
    })
  })

  describe('syncAllReactionCounts', () => {
    beforeEach(() => {
      // Mock console.log to avoid cluttering test output
      jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      // Restore console.log
      ;(console.log as jest.Mock).mockRestore()
    })

    it('should sync reaction counts for all posts in batches', async () => {
      // Arrange
      const postIds = Array.from({ length: 250 }, (_, i) => `post-${i}`)
      
      mockRepository.getAllPostIds.mockResolvedValue(postIds)
      mockRepository.syncReactionCounts.mockResolvedValue(undefined)

      // Act
      await reactionService.syncAllReactionCounts()

      // Assert
      expect(mockRepository.getAllPostIds).toHaveBeenCalledTimes(1)
      expect(mockRepository.syncReactionCounts).toHaveBeenCalledTimes(250)
      
      // Verify each post was synced
      postIds.forEach(postId => {
        expect(mockRepository.syncReactionCounts).toHaveBeenCalledWith(postId)
      })

      // Verify console output
      expect(console.log).toHaveBeenCalledWith('Starting to sync reaction counts for 250 posts')
      expect(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 1 to 100')
      expect(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 101 to 200')
      expect(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 201 to 250')
      expect(console.log).toHaveBeenCalledWith('Reaction count sync completed')
    })

    it('should handle empty post list', async () => {
      // Arrange
      mockRepository.getAllPostIds.mockResolvedValue([])

      // Act
      await reactionService.syncAllReactionCounts()

      // Assert
      expect(mockRepository.getAllPostIds).toHaveBeenCalledTimes(1)
      expect(mockRepository.syncReactionCounts).not.toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith('Starting to sync reaction counts for 0 posts')
      expect(console.log).toHaveBeenCalledWith('Reaction count sync completed')
    })

    it('should handle exactly one batch (100 posts)', async () => {
      // Arrange
      const postIds = Array.from({ length: 100 }, (_, i) => `post-${i}`)
      
      mockRepository.getAllPostIds.mockResolvedValue(postIds)
      mockRepository.syncReactionCounts.mockResolvedValue(undefined)

      // Act
      await reactionService.syncAllReactionCounts()

      // Assert
      expect(mockRepository.syncReactionCounts).toHaveBeenCalledTimes(100)
      expect(console.log).toHaveBeenCalledWith('Starting to sync reaction counts for 100 posts')
      expect(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 1 to 100')
      expect(console.log).toHaveBeenCalledWith('Reaction count sync completed')
    })

    it('should handle repository errors during getAllPostIds', async () => {
      // Arrange
      const repositoryError = new Error('Failed to retrieve post IDs')
      mockRepository.getAllPostIds.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(reactionService.syncAllReactionCounts()).rejects.toThrow('Failed to retrieve post IDs')

      expect(mockRepository.getAllPostIds).toHaveBeenCalledTimes(1)
      expect(mockRepository.syncReactionCounts).not.toHaveBeenCalled()
    })

    it('should handle repository errors during syncReactionCounts', async () => {
      // Arrange
      const postIds = ['post-1', 'post-2', 'post-3']
      const repositoryError = new Error('Failed to sync reaction counts')
      
      mockRepository.getAllPostIds.mockResolvedValue(postIds)
      mockRepository.syncReactionCounts.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(reactionService.syncAllReactionCounts()).rejects.toThrow('Failed to sync reaction counts')

      expect(mockRepository.getAllPostIds).toHaveBeenCalledTimes(1)
      expect(mockRepository.syncReactionCounts).toHaveBeenCalled()
    })

    it('should handle partial failures in batch processing', async () => {
      // Arrange
      const postIds = ['post-1', 'post-2', 'post-3']
      
      mockRepository.getAllPostIds.mockResolvedValue(postIds)
      mockRepository.syncReactionCounts
        .mockResolvedValueOnce(undefined)  // post-1 succeeds
        .mockRejectedValueOnce(new Error('Sync failed for post-2'))  // post-2 fails
        .mockResolvedValueOnce(undefined)  // post-3 succeeds

      // Act & Assert
      await expect(reactionService.syncAllReactionCounts()).rejects.toThrow('Sync failed for post-2')

      expect(mockRepository.getAllPostIds).toHaveBeenCalledTimes(1)
      expect(mockRepository.syncReactionCounts).toHaveBeenCalledTimes(3)
    })

    it('should process very large number of posts efficiently', async () => {
      // Arrange
      const postIds = Array.from({ length: 1000 }, (_, i) => `post-${i}`)
      
      mockRepository.getAllPostIds.mockResolvedValue(postIds)
      mockRepository.syncReactionCounts.mockResolvedValue(undefined)

      // Act
      await reactionService.syncAllReactionCounts()

      // Assert
      expect(mockRepository.syncReactionCounts).toHaveBeenCalledTimes(1000)
      expect(console.log).toHaveBeenCalledWith('Starting to sync reaction counts for 1000 posts')
      expect(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 1 to 100')
      expect(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 901 to 1000')
      expect(console.log).toHaveBeenCalledWith('Reaction count sync completed')
    })

    it('should handle single post scenario', async () => {
      // Arrange
      const postIds = ['post-1']
      
      mockRepository.getAllPostIds.mockResolvedValue(postIds)
      mockRepository.syncReactionCounts.mockResolvedValue(undefined)

      // Act
      await reactionService.syncAllReactionCounts()

      // Assert
      expect(mockRepository.syncReactionCounts).toHaveBeenCalledTimes(1)
      expect(mockRepository.syncReactionCounts).toHaveBeenCalledWith('post-1')
      expect(console.log).toHaveBeenCalledWith('Starting to sync reaction counts for 1 posts')
      expect(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 1 to 1')
      expect(console.log).toHaveBeenCalledWith('Reaction count sync completed')
    })
  })

  describe('Edge Cases and Integration Scenarios', () => {
    it('should handle concurrent createReaction calls for same user and post', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.LIKE
      const existingReaction = createMockReaction({ userId, postId, type })

      mockRepository.getByPostIdAndUserId.mockResolvedValue(existingReaction)

      // Act
      const [result1, result2] = await Promise.all([
        reactionService.createReaction(userId, postId, type),
        reactionService.createReaction(userId, postId, type)
      ])

      // Assert
      expect(result1).toEqual(existingReaction)
      expect(result2).toEqual(existingReaction)
      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('should handle different reaction types for same user and post', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const likeReaction = createMockReaction({ userId, postId, type: ReactionType.LIKE })
      const retweetReaction = createMockReaction({ userId, postId, type: ReactionType.RETWEET })

      mockRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockRepository.create
        .mockResolvedValueOnce(likeReaction)
        .mockResolvedValueOnce(retweetReaction)

      // Act
      const [likeResult, retweetResult] = await Promise.all([
        reactionService.createReaction(userId, postId, ReactionType.LIKE),
        reactionService.createReaction(userId, postId, ReactionType.RETWEET)
      ])

      // Assert
      expect(likeResult.type).toBe(ReactionType.LIKE)
      expect(retweetResult.type).toBe(ReactionType.RETWEET)
      expect(mockRepository.create).toHaveBeenCalledTimes(2)
    })

    it('should handle mixed operations on same post', async () => {
      // Arrange
      const userId1 = 'user-1'
      const userId2 = 'user-2'
      const postId = 'post-1'
      const type = ReactionType.LIKE

      mockRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(createMockReaction({ userId: userId1, postId, type }))
      mockRepository.delete.mockResolvedValue(undefined)
      mockRepository.getCountByPostId
        .mockResolvedValueOnce(1)  // likes
        .mockResolvedValueOnce(0)  // retweets

      // Act
      const [createResult, , countsResult] = await Promise.all([
        reactionService.createReaction(userId1, postId, type),
        reactionService.deleteReaction(userId2, postId, type),
        reactionService.getReactionCountsForPost(postId)
      ])

      // Assert
      expect(createResult).toBeDefined()
      expect(countsResult).toEqual({ likes: 1, retweets: 0 })
      expect(mockRepository.create).toHaveBeenCalledWith(userId1, postId, type)
      expect(mockRepository.delete).toHaveBeenCalledWith(userId2, postId, type)
    })

    it('should handle null/undefined repository responses gracefully', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const type = ReactionType.LIKE

      // Test when getByPostIdAndUserId returns null
      mockRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(createMockReaction({ userId, postId, type }))

      // Act & Assert - should not throw error
      const result = await reactionService.createReaction(userId, postId, type)
      expect(result).toBeDefined()

      // Test hasUserReacted with null response
      const hasReacted = await reactionService.hasUserReacted(userId, postId, type)
      expect(hasReacted).toBe(false)
    })

    it('should maintain consistent behavior across all reaction types', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const reactionTypes = [ReactionType.LIKE, ReactionType.RETWEET]

      for (const type of reactionTypes) {
        mockRepository.getByPostIdAndUserId.mockResolvedValue(null)
        mockRepository.create.mockResolvedValue(createMockReaction({ userId, postId, type }))

        // Act
        const result = await reactionService.createReaction(userId, postId, type)

        // Assert
        expect(result.type).toBe(type)
        expect(mockRepository.create).toHaveBeenCalledWith(userId, postId, type)
      }
    })

    it('should handle very long user and post IDs', async () => {
      // Arrange
      const longUserId = 'a'.repeat(1000)
      const longPostId = 'b'.repeat(1000)
      const type = ReactionType.LIKE
      const reaction = createMockReaction({ userId: longUserId, postId: longPostId, type })

      mockRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockRepository.create.mockResolvedValue(reaction)

      // Act
      const result = await reactionService.createReaction(longUserId, longPostId, type)

      // Assert
      expect(result).toEqual(reaction)
      expect(mockRepository.create).toHaveBeenCalledWith(longUserId, longPostId, type)
    })
  })

  describe('Performance and Scalability', () => {
    beforeEach(() => {
      // Mock console.log to avoid cluttering test output
      jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      // Restore console.log
      ;(console.log as jest.Mock).mockRestore()
    })

    it('should handle batch processing in syncAllReactionCounts efficiently', async () => {
      // Arrange
      const largePostIds = Array.from({ length: 500 }, (_, i) => `post-${i}`)
      
      mockRepository.getAllPostIds.mockResolvedValue(largePostIds)
      mockRepository.syncReactionCounts.mockResolvedValue(undefined)

      // Mock performance timing
      const startTime = Date.now()

      // Act
      await reactionService.syncAllReactionCounts()

      const endTime = Date.now()

      // Assert
      expect(mockRepository.syncReactionCounts).toHaveBeenCalledTimes(500)
      
      // Verify batching by checking call patterns
      expect(console.log).toHaveBeenCalledWith('Starting to sync reaction counts for 500 posts')
      expect(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 1 to 100')
      expect(console.log).toHaveBeenCalledWith('Processed reaction counts for posts 401 to 500')
      expect(console.log).toHaveBeenCalledWith('Reaction count sync completed')

      // Test should complete reasonably quickly (mocked calls)
      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds max for mocked operations
    })

    it('should handle concurrent user reaction queries efficiently', async () => {
      // Arrange
      const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`)
      const type = ReactionType.LIKE
      
      mockRepository.getByUserId.mockResolvedValue([createMockReaction({ type })])

      // Act
      const results = await Promise.all(
        userIds.map(userId => reactionService.getUserReactions(userId, type))
      )

      // Assert
      expect(results).toHaveLength(10)
      expect(mockRepository.getByUserId).toHaveBeenCalledTimes(10)
      
      userIds.forEach(userId => {
        expect(mockRepository.getByUserId).toHaveBeenCalledWith(userId, type)
      })
    })

    it('should handle concurrent reaction count queries for multiple posts', async () => {
      // Arrange
      const postIds = Array.from({ length: 5 }, (_, i) => `post-${i}`)
      
      mockRepository.getCountByPostId.mockResolvedValue(10)

      // Act
      const results = await Promise.all(
        postIds.map(postId => reactionService.getReactionCountsForPost(postId))
      )

      // Assert
      expect(results).toHaveLength(5)
      expect(mockRepository.getCountByPostId).toHaveBeenCalledTimes(10) // 2 calls per post (like + retweet)
      
      results.forEach(result => {
        expect(result).toEqual({ likes: 10, retweets: 10 })
      })
    })
  })
})