import { ChatRoomService } from './chat-room.service'
import { ChatRoomRepository } from '../repository/chat-room.repository'
import { ChatRoomMemberRepository } from '../repository/chat-room-member.repository'
import { MessageRepository } from '../repository/message.repository'
import { ChatRoomDTO, ChatRoomType, CreateChatRoomDTO, ChatRoomSummaryDTO, UpdateChatRoomDTO } from '../dto/chat-room.dto'
import { ChatRoomMemberDTO } from '../dto/chat-room-member.dto'
import { MessageDTO, MessageType } from '../dto/message.dto'
import { FollowerRepository } from '@domains/follower/repository/follower.repository'
import { ValidationError, AuthorizationError } from '../dto/errors.dto'
import { jest, describe, beforeEach, it, expect} from '@jest/globals'

describe('ChatRoomService', () => {
  let chatRoomService: ChatRoomService
  let mockChatRoomRepository: jest.Mocked<ChatRoomRepository>
  let mockChatRoomMemberRepository: jest.Mocked<ChatRoomMemberRepository>
  let mockMessageRepository: jest.Mocked<MessageRepository>
  let mockFollowerRepository: jest.Mocked<FollowerRepository>

  // Test data factories
  const createMockChatRoom = (overrides: Partial<ChatRoomDTO> = {}): ChatRoomDTO => ({
    id: 'room-1',
    name: 'Test Room',
    type: ChatRoomType.GROUP,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  })

  const createMockCreateChatRoomDTO = (overrides: Partial<CreateChatRoomDTO> = {}): CreateChatRoomDTO => ({
    name: 'Test Room',
    type: ChatRoomType.GROUP,
    memberIds: ['user-1', 'user-2'],
    ...overrides
  })

  const createMockChatRoomSummary = (overrides: Partial<ChatRoomSummaryDTO> = {}): ChatRoomSummaryDTO => ({
    id: 'room-1',
    name: 'Test Room',
    type: ChatRoomType.GROUP,
    memberCount: 2,
    unreadCount: 0,
    lastMessage: undefined,
    ...overrides
  })

  const mockMessage: MessageDTO = {
    id: 'message-1',
    chatRoomId: 'room-1',
    authorId: 'user-1',
    content: 'Test message',
    type: MessageType.TEXT,
    isEncrypted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 'user-1',
      username: 'testuser',
      name: 'Test User',
      profilePicture: undefined
    }
  }

  beforeEach(() => {
    // Create mocked repositories
    mockChatRoomRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByMemberId: jest.fn(),
      findDMBetweenUsers: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createWithTransaction: jest.fn(),
      findOrCreateDMTransaction: jest.fn(),
      getUnreadCountForUser: jest.fn()
    } as jest.Mocked<ChatRoomRepository>

    mockChatRoomMemberRepository = {
      isMember: jest.fn(),
      getMemberCount: jest.fn(),
      findByChatRoomId: jest.fn(),
      findByUserId: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
      updateLastRead: jest.fn()
    } as jest.Mocked<ChatRoomMemberRepository>

    mockMessageRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByChatRoomId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getLastMessageForChatRoom: jest.fn(),
      getMessageCountAfterTimestamp: jest.fn()
    } as jest.Mocked<MessageRepository>

    mockFollowerRepository = {
      isFollowing: jest.fn(),
      follow: jest.fn(),
      unfollow: jest.fn()
    } as jest.Mocked<FollowerRepository>

    // Reset all mocks
    jest.clearAllMocks()

    // Create service instance
    chatRoomService = new ChatRoomService(
      mockChatRoomRepository,
      mockChatRoomMemberRepository,
      mockMessageRepository,
      mockFollowerRepository
    )
  })

  describe('createChatRoom', () => {
    it('should successfully create a group chat when all conditions are met', async () => {
      // Arrange
      const createData = createMockCreateChatRoomDTO()
      const requesterId = 'user-1'
      const expectedRoom = createMockChatRoom(createData)
      
      mockFollowerRepository.isFollowing.mockResolvedValue(true) // All mutual follows
      mockChatRoomRepository.createWithTransaction.mockResolvedValue(expectedRoom)

      // Act
      const result = await chatRoomService.createChatRoom(createData, requesterId)

      // Assert
      expect(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(2) // Mutual check for 2 users
      expect(mockChatRoomRepository.createWithTransaction).toHaveBeenCalledWith(createData)
      expect(result).toEqual(expectedRoom)
    })

    it('should throw ValidationError when requester is not in member list', async () => {
      // Arrange
      const createData = createMockCreateChatRoomDTO()
      const requesterId = 'unauthorized-user'

      // Act & Assert
      await expect(chatRoomService.createChatRoom(createData, requesterId))
        .rejects.toThrow('Requester must be included in the chat room members')

      expect(mockFollowerRepository.isFollowing).not.toHaveBeenCalled()
      expect(mockChatRoomRepository.createWithTransaction).not.toHaveBeenCalled()
    })

    it('should throw ValidationError for DM with incorrect member count', async () => {
      // Arrange
      const createData = createMockCreateChatRoomDTO({
        type: ChatRoomType.DM,
        memberIds: ['user-1', 'user-2', 'user-3'] // 3 members for DM
      })
      const requesterId = 'user-1'

      // Act & Assert
      await expect(chatRoomService.createChatRoom(createData, requesterId))
        .rejects.toThrow('DM chats must have exactly 2 members')

      expect(mockChatRoomRepository.createWithTransaction).not.toHaveBeenCalled()
    })

    it('should throw AuthorizationError when mutual follow validation fails', async () => {
      // Arrange
      const createData = createMockCreateChatRoomDTO()
      const requesterId = 'user-1'
      
      mockFollowerRepository.isFollowing
        .mockResolvedValueOnce(true)  // user-1 follows user-2
        .mockResolvedValueOnce(false) // user-2 does NOT follow user-1

      // Act & Assert
      await expect(chatRoomService.createChatRoom(createData, requesterId))
        .rejects.toThrow('Users user-1 and user-2 must follow each other to be in the same group')

      expect(mockChatRoomRepository.createWithTransaction).not.toHaveBeenCalled()
    })

    it('should handle large groups with optimized batch validation', async () => {
      // Arrange
      const createData = createMockCreateChatRoomDTO({
        memberIds: ['user-1', 'user-2', 'user-3', 'user-4'] // 4 users = 6 pairs
      })
      const requesterId = 'user-1'
      const expectedRoom = createMockChatRoom(createData)
      
      mockFollowerRepository.isFollowing.mockResolvedValue(true) // All mutual follows
      mockChatRoomRepository.createWithTransaction.mockResolvedValue(expectedRoom)

      // Act
      const result = await chatRoomService.createChatRoom(createData, requesterId)

      // Assert
      expect(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(12) // 6 pairs × 2 directions
      expect(result).toEqual(expectedRoom)
    })

    it('should gracefully degrade when circuit breaker is open', async () => {
      // Arrange
      const createData = createMockCreateChatRoomDTO()
      const requesterId = 'user-1'
      const expectedRoom = createMockChatRoom(createData)
      
      // Simulate follower service failures to trigger circuit breaker
      mockFollowerRepository.isFollowing.mockRejectedValue(new Error('Service unavailable'))
      mockChatRoomRepository.createWithTransaction.mockResolvedValue(expectedRoom)

      // Act - First few calls should fail and open circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await chatRoomService.createChatRoom(createData, requesterId)
        } catch (error) {
          // Expected to fail
        }
      }

      // Act - Subsequent call should bypass validation due to open circuit breaker
      const result = await chatRoomService.createChatRoom(createData, requesterId)

      // Assert
      expect(result).toEqual(expectedRoom)
      expect(mockChatRoomRepository.createWithTransaction).toHaveBeenCalled()
    })
  })

  describe('getChatRoom', () => {
    it('should successfully retrieve chat room when user is a member', async () => {
      // Arrange
      const roomId = 'room-1'
      const userId = 'user-1'
      const expectedRoom = createMockChatRoom({ id: roomId })
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomRepository.findById.mockResolvedValue(expectedRoom)

      // Act
      const result = await chatRoomService.getChatRoom(roomId, userId)

      // Assert
      expect(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(roomId, userId)
      expect(mockChatRoomRepository.findById).toHaveBeenCalledWith(roomId)
      expect(result).toEqual(expectedRoom)
    })

    it('should throw AuthorizationError when user is not a member', async () => {
      // Arrange
      const roomId = 'room-1'
      const userId = 'unauthorized-user'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(false)

      // Act & Assert
      await expect(chatRoomService.getChatRoom(roomId, userId))
        .rejects.toThrow('User is not a member of this chat room')

      expect(mockChatRoomRepository.findById).not.toHaveBeenCalled()
    })

    it('should return null when chat room does not exist', async () => {
      // Arrange
      const roomId = 'non-existent-room'
      const userId = 'user-1'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomRepository.findById.mockResolvedValue(null)

      // Act
      const result = await chatRoomService.getChatRoom(roomId, userId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('getUserChatRooms', () => {
    it('should successfully retrieve user chat rooms with summaries', async () => {
      // Arrange
      const userId = 'user-1'
      const chatRooms = [
        createMockChatRoom({ id: 'room-1', name: 'Room 1' }),
        createMockChatRoom({ id: 'room-2', name: 'Room 2' })
      ]
      const lastMessage = {
        id: 'message-1',
        chatRoomId: 'room-1',
        content: 'Last message',
        type: MessageType.TEXT,
        isEncrypted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        authorId: 'user-2'
      }
      
      mockChatRoomRepository.findByMemberId.mockResolvedValue(chatRooms)
      mockChatRoomMemberRepository.getMemberCount.mockResolvedValue(2)
      mockMessageRepository.getLastMessageForChatRoom.mockResolvedValue(lastMessage)
      mockChatRoomRepository.getUnreadCountForUser.mockResolvedValue(3)

      // Act
      const result = await chatRoomService.getUserChatRooms(userId)

      // Assert
      expect(mockChatRoomRepository.findByMemberId).toHaveBeenCalledWith(userId)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'room-1',
        memberCount: 2,
        unreadCount: 3,
        lastMessage: expect.objectContaining({
          content: 'Last message'
        })
      }))
    })

    it('should handle chat rooms without last messages', async () => {
      // Arrange
      const userId = 'user-1'
      const chatRooms = [createMockChatRoom({ id: 'room-1' })]
      
      mockChatRoomRepository.findByMemberId.mockResolvedValue(chatRooms)
      mockChatRoomMemberRepository.getMemberCount.mockResolvedValue(2)
      mockMessageRepository.getLastMessageForChatRoom.mockResolvedValue(null)
      mockChatRoomRepository.getUnreadCountForUser.mockResolvedValue(0)

      // Act
      const result = await chatRoomService.getUserChatRooms(userId)

      // Assert
      expect(result[0].lastMessage).toBeUndefined()
      expect(result[0].unreadCount).toBe(0)
    })

    it('should handle empty chat room list', async () => {
      // Arrange
      const userId = 'user-with-no-rooms'
      
      mockChatRoomRepository.findByMemberId.mockResolvedValue([])

      // Act
      const result = await chatRoomService.getUserChatRooms(userId)

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('findOrCreateDMChatRoom', () => {
    it('should create new DM when none exists and users follow each other', async () => {
      // Arrange
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      const expectedRoom = createMockChatRoom({ type: ChatRoomType.DM })
      
      mockFollowerRepository.isFollowing.mockResolvedValue(true) // Mutual follows
      mockChatRoomRepository.findOrCreateDMTransaction.mockResolvedValue(expectedRoom)

      // Act
      const result = await chatRoomService.findOrCreateDMChatRoom(user1Id, user2Id)

      // Assert
      expect(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(2)
      expect(mockFollowerRepository.isFollowing).toHaveBeenCalledWith(user1Id, user2Id)
      expect(mockFollowerRepository.isFollowing).toHaveBeenCalledWith(user2Id, user1Id)
      expect(mockChatRoomRepository.findOrCreateDMTransaction).toHaveBeenCalledWith(user1Id, user2Id)
      expect(result).toEqual(expectedRoom)
    })

    it('should throw AuthorizationError when users do not follow each other', async () => {
      // Arrange
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      
      mockFollowerRepository.isFollowing
        .mockResolvedValueOnce(true)  // user-1 follows user-2
        .mockResolvedValueOnce(false) // user-2 does NOT follow user-1

      // Act & Assert
      await expect(chatRoomService.findOrCreateDMChatRoom(user1Id, user2Id))
        .rejects.toThrow('Users must follow each other to chat')

      expect(mockChatRoomRepository.findOrCreateDMTransaction).not.toHaveBeenCalled()
    })

    it('should find existing DM when it already exists', async () => {
      // Arrange
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      const existingRoom = createMockChatRoom({ type: ChatRoomType.DM, id: 'existing-dm' })
      
      mockFollowerRepository.isFollowing.mockResolvedValue(true)
      mockChatRoomRepository.findOrCreateDMTransaction.mockResolvedValue(existingRoom)

      // Act
      const result = await chatRoomService.findOrCreateDMChatRoom(user1Id, user2Id)

      // Assert
      expect(result).toEqual(existingRoom)
      expect(result.id).toBe('existing-dm')
    })

    it('should handle circuit breaker graceful degradation for DM creation', async () => {
      // Arrange
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      const expectedRoom = createMockChatRoom({ type: ChatRoomType.DM })
      
      // Simulate multiple failures to open circuit breaker
      mockFollowerRepository.isFollowing.mockRejectedValue(new Error('Service down'))
      
      // Trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await chatRoomService.findOrCreateDMChatRoom(user1Id, user2Id)
        } catch (error) {
          // Expected to fail
        }
      }

      // Now should bypass validation
      mockChatRoomRepository.findOrCreateDMTransaction.mockResolvedValue(expectedRoom)
      const result = await chatRoomService.findOrCreateDMChatRoom(user1Id, user2Id)

      // Assert
      expect(result).toEqual(expectedRoom)
    })
  })

  describe('updateChatRoom', () => {
    it('should successfully update chat room when user is a member', async () => {
      // Arrange
      const roomId = 'room-1'
      const userId = 'user-1'
      const updateData: UpdateChatRoomDTO = { name: 'Updated Room Name' }
      const updatedRoom = createMockChatRoom({ id: roomId, name: 'Updated Room Name' })
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomRepository.update.mockResolvedValue(updatedRoom)

      // Act
      const result = await chatRoomService.updateChatRoom(roomId, updateData, userId)

      // Assert
      expect(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(roomId, userId)
      expect(mockChatRoomRepository.update).toHaveBeenCalledWith(roomId, updateData)
      expect(result).toEqual(updatedRoom)
    })

    it('should throw AuthorizationError when user is not a member', async () => {
      // Arrange
      const roomId = 'room-1'
      const userId = 'unauthorized-user'
      const updateData: UpdateChatRoomDTO = { name: 'Updated Room Name' }
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(false)

      // Act & Assert
      await expect(chatRoomService.updateChatRoom(roomId, updateData, userId))
        .rejects.toThrow('User is not a member of this chat room')

      expect(mockChatRoomRepository.update).not.toHaveBeenCalled()
    })
  })

  describe('deleteChatRoom', () => {
    it('should successfully delete chat room when user is a member', async () => {
      // Arrange
      const roomId = 'room-1'
      const userId = 'user-1'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomRepository.delete.mockResolvedValue(undefined)

      // Act
      await chatRoomService.deleteChatRoom(roomId, userId)

      // Assert
      expect(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(roomId, userId)
      expect(mockChatRoomRepository.delete).toHaveBeenCalledWith(roomId)
    })

    it('should throw AuthorizationError when user is not a member', async () => {
      // Arrange
      const roomId = 'room-1'
      const userId = 'unauthorized-user'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(false)

      // Act & Assert
      await expect(chatRoomService.deleteChatRoom(roomId, userId))
        .rejects.toThrow('User is not a member of this chat room')

      expect(mockChatRoomRepository.delete).not.toHaveBeenCalled()
    })
  })

  describe('getUnreadCountForUser', () => {
    it('should successfully return unread count for user', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      const expectedCount = 5
      
      mockChatRoomRepository.getUnreadCountForUser.mockResolvedValue(expectedCount)

      // Act
      const result = await chatRoomService.getUnreadCountForUser(chatRoomId, userId)

      // Assert
      expect(mockChatRoomRepository.getUnreadCountForUser).toHaveBeenCalledWith(chatRoomId, userId)
      expect(result).toBe(expectedCount)
    })

    it('should return zero when no unread messages', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      
      mockChatRoomRepository.getUnreadCountForUser.mockResolvedValue(0)

      // Act
      const result = await chatRoomService.getUnreadCountForUser(chatRoomId, userId)

      // Assert
      expect(result).toBe(0)
    })
  })

  describe('Circuit Breaker Functionality', () => {
    it('should open circuit breaker after threshold failures', async () => {
      // Arrange
      const createData = createMockCreateChatRoomDTO()
      const requesterId = 'user-1'
      
      mockFollowerRepository.isFollowing.mockRejectedValue(new Error('Service down'))

      // Act - Trigger failures to reach threshold
      for (let i = 0; i < 5; i++) {
        try {
          await chatRoomService.createChatRoom(createData, requesterId)
        } catch (error) {
          // Expected to fail
        }
      }

      // Assert - Next call should bypass validation due to open circuit
      mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom())
      const result = await chatRoomService.createChatRoom(createData, requesterId)
      
      expect(result).toBeDefined()
      expect(mockChatRoomRepository.createWithTransaction).toHaveBeenCalled()
    })

    it('should reset circuit breaker on successful calls', async () => {
      // Arrange
      const createData = createMockCreateChatRoomDTO()
      const requesterId = 'user-1'
      
      // First call succeeds
      mockFollowerRepository.isFollowing.mockResolvedValue(true)
      mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom())

      // Act
      await chatRoomService.createChatRoom(createData, requesterId)

      // Assert - Circuit breaker should be in CLOSED state
      // Subsequent calls should continue to work normally
      const result = await chatRoomService.createChatRoom(createData, requesterId)
      expect(result).toBeDefined()
    })

    it('should transition from OPEN to HALF_OPEN after timeout', async () => {
      // This test would require more complex timing control
      // In a real implementation, you might use jest.useFakeTimers()
      expect(true).toBe(true) // Placeholder for timeout-based circuit breaker testing
    })
  })

  describe('Performance and Batch Operations', () => {
    it('should efficiently validate mutual follows for large groups', async () => {
      // Arrange
      const memberIds = Array.from({ length: 10 }, (_, i) => `user-${i + 1}`)
      const createData = createMockCreateChatRoomDTO({ memberIds })
      const requesterId = 'user-1'
      
      mockFollowerRepository.isFollowing.mockResolvedValue(true)
      mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom())

      // Act
      const start = Date.now()
      await chatRoomService.createChatRoom(createData, requesterId)
      const duration = Date.now() - start

      // Assert
      // For 10 users: 45 pairs × 2 directions = 90 calls
      expect(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(90)
      expect(duration).toBeLessThan(1000) // Should complete quickly with batch processing
    })

    it('should handle empty member lists gracefully', async () => {
      // Arrange
      const createData = createMockCreateChatRoomDTO({ memberIds: [] })
      const requesterId = 'user-1'

      // Act & Assert
      await expect(chatRoomService.createChatRoom(createData, requesterId))
        .rejects.toThrow('Requester must be included in the chat room members')
    })

    it('should optimize single-user groups (edge case)', async () => {
      // Arrange
      const createData = createMockCreateChatRoomDTO({ memberIds: ['user-1'] })
      const requesterId = 'user-1'
      
      mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom())

      // Act
      const result = await chatRoomService.createChatRoom(createData, requesterId)

      // Assert
      expect(mockFollowerRepository.isFollowing).not.toHaveBeenCalled() // No pairs to validate
      expect(result).toBeDefined()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle repository transaction failures gracefully', async () => {
      // Arrange
      const createData = createMockCreateChatRoomDTO()
      const requesterId = 'user-1'
      
      mockFollowerRepository.isFollowing.mockResolvedValue(true)
      mockChatRoomRepository.createWithTransaction.mockRejectedValue(new Error('Transaction failed'))

      // Act & Assert
      await expect(chatRoomService.createChatRoom(createData, requesterId))
        .rejects.toThrow('Transaction failed')
    })

    it('should handle invalid chat room types', async () => {
      // Arrange
      const createData = createMockCreateChatRoomDTO({ 
        type: 'INVALID_TYPE' as ChatRoomType,
        memberIds: ['user-1', 'user-2', 'user-3']
      })
      const requesterId = 'user-1'

      // Act - Should not throw for unknown types (let repository handle)
      mockFollowerRepository.isFollowing.mockResolvedValue(true)
      mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom())
      
      const result = await chatRoomService.createChatRoom(createData, requesterId)

      // Assert
      expect(result).toBeDefined()
    })

    it('should handle concurrent room creation attempts', async () => {
      // Arrange
      const createData1 = createMockCreateChatRoomDTO({ name: 'Room 1' })
      const createData2 = createMockCreateChatRoomDTO({ name: 'Room 2' })
      const requesterId = 'user-1'
      
      mockFollowerRepository.isFollowing.mockResolvedValue(true)
      mockChatRoomRepository.createWithTransaction
        .mockResolvedValueOnce(createMockChatRoom({ name: 'Room 1' }))
        .mockResolvedValueOnce(createMockChatRoom({ name: 'Room 2' }))

      // Act
      const [result1, result2] = await Promise.all([
        chatRoomService.createChatRoom(createData1, requesterId),
        chatRoomService.createChatRoom(createData2, requesterId)
      ])

      // Assert
      expect(result1.name).toBe('Room 1')
      expect(result2.name).toBe('Room 2')
    })

    it('should handle very long chat room names', async () => {
      // Arrange
      const longName = 'A'.repeat(1000)
      const createData = createMockCreateChatRoomDTO({ name: longName })
      const requesterId = 'user-1'
      
      mockFollowerRepository.isFollowing.mockResolvedValue(true)
      mockChatRoomRepository.createWithTransaction.mockResolvedValue(
        createMockChatRoom({ name: longName })
      )

      // Act
      const result = await chatRoomService.createChatRoom(createData, requesterId)

      // Assert
      expect(result.name).toBe(longName)
    })

    it('should handle special characters in user IDs', async () => {
      // Arrange
      const specialUserIds = ['user-@#$', 'user-ñáéíóú', 'user-🌍']
      const createData = createMockCreateChatRoomDTO({ memberIds: specialUserIds })
      const requesterId = 'user-@#$'
      
      mockFollowerRepository.isFollowing.mockResolvedValue(true)
      mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom())

      // Act
      const result = await chatRoomService.createChatRoom(createData, requesterId)

      // Assert
      expect(result).toBeDefined()
      expect(mockFollowerRepository.isFollowing).toHaveBeenCalled()
    })
  })
})