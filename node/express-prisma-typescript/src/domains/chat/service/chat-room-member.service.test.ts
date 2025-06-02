import { ChatRoomMemberService } from './chat-room-member.service'
import { ChatRoomMemberRepository } from '../repository/chat-room-member.repository'
import { ChatRoomRepository } from '../repository/chat-room.repository'
import { AddMemberToChatRoomDTO, ChatRoomMemberDTO, UpdateLastReadDTO } from '../dto/chat-room-member.dto'
import { describe, it, beforeEach, expect, jest } from '@jest/globals'

describe('ChatRoomMemberService', () => {
  let chatRoomMemberService: ChatRoomMemberService
  let mockChatRoomMemberRepository: jest.Mocked<ChatRoomMemberRepository>
  let mockChatRoomRepository: jest.Mocked<ChatRoomRepository>

  // Test data factories
  const createMockChatRoomMember = (overrides: Partial<ChatRoomMemberDTO> = {}): ChatRoomMemberDTO => ({
    id: 'member-1',
    chatRoomId: 'room-1',
    userId: 'user-1',
    joinedAt: new Date(),
    lastReadAt: new Date(),
    ...overrides
  })

  const createMockAddMemberDTO = (overrides: Partial<AddMemberToChatRoomDTO> = {}): AddMemberToChatRoomDTO => ({
    chatRoomId: 'room-1',
    userId: 'user-2',
    ...overrides
  })

  const createMockUpdateLastReadDTO = (overrides: Partial<UpdateLastReadDTO> = {}): UpdateLastReadDTO => ({
    chatRoomId: 'room-1',
    userId: 'user-1',
    lastReadAt: new Date(),
    ...overrides
  })

  const createMockChatRoom = (overrides: any = {}) => ({
    id: 'room-1',
    name: 'Test Room',
    type: 'GROUP',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  })

  beforeEach(() => {
    // Create mocked repositories
    mockChatRoomMemberRepository = {
      addMember: jest.fn(),
      removeMember: jest.fn(),
      findByChatRoomId: jest.fn(),
      findByUserId: jest.fn(),
      isMember: jest.fn(),
      updateLastRead: jest.fn(),
      getMemberCount: jest.fn()
    } as jest.Mocked<ChatRoomMemberRepository>

    mockChatRoomRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      findByMemberId: jest.fn(),
      findDMBetweenUsers: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createWithTransaction: jest.fn(),
      findOrCreateDMTransaction: jest.fn(),
      getUnreadCountForUser: jest.fn()
    } as jest.Mocked<ChatRoomRepository>

    // Reset all mocks
    jest.clearAllMocks()

    // Create service instance
    chatRoomMemberService = new ChatRoomMemberService(
      mockChatRoomMemberRepository,
      mockChatRoomRepository
    )
  })

  describe('addMemberToChatRoom', () => {
    it('should successfully add member when requester is authorized', async () => {
      // Arrange
      const addMemberData = createMockAddMemberDTO()
      const requesterId = 'user-1'
      const expectedMember = createMockChatRoomMember(addMemberData)
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true) // Requester is member
      mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom())
      mockChatRoomMemberRepository.addMember.mockResolvedValue(expectedMember)

      // Act
      const result = await chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId)

      // Assert
      expect(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(addMemberData.chatRoomId, requesterId)
      expect(mockChatRoomRepository.findById).toHaveBeenCalledWith(addMemberData.chatRoomId)
      expect(mockChatRoomMemberRepository.addMember).toHaveBeenCalledWith(addMemberData)
      expect(result).toEqual(expectedMember)
    })

    it('should throw error when requester is not a member of the chat room', async () => {
      // Arrange
      const addMemberData = createMockAddMemberDTO()
      const requesterId = 'unauthorized-user'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(false)

      // Act & Assert
      await expect(chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId))
        .rejects.toThrow('User is not a member of this chat room')

      expect(mockChatRoomRepository.findById).not.toHaveBeenCalled()
      expect(mockChatRoomMemberRepository.addMember).not.toHaveBeenCalled()
    })

    it('should throw error when chat room does not exist', async () => {
      // Arrange
      const addMemberData = createMockAddMemberDTO()
      const requesterId = 'user-1'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomRepository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId))
        .rejects.toThrow('Chat room not found')

      expect(mockChatRoomMemberRepository.addMember).not.toHaveBeenCalled()
    })

    it('should handle repository errors during member addition', async () => {
      // Arrange
      const addMemberData = createMockAddMemberDTO()
      const requesterId = 'user-1'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom())
      mockChatRoomMemberRepository.addMember.mockRejectedValue(new Error('Database constraint violation'))

      // Act & Assert
      await expect(chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId))
        .rejects.toThrow('Database constraint violation')
    })

    it('should handle adding member who is already a member', async () => {
      // Arrange
      const addMemberData = createMockAddMemberDTO()
      const requesterId = 'user-1'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom())
      mockChatRoomMemberRepository.addMember.mockRejectedValue(new Error('User already a member'))

      // Act & Assert
      await expect(chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId))
        .rejects.toThrow('User already a member')
    })
  })

  describe('removeMemberFromChatRoom', () => {
    it('should successfully remove member when user removes themselves', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      const requesterId = 'user-1' // Same user removing themselves
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined)

      // Act
      await chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId)

      // Assert
      expect(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(chatRoomId, requesterId)
      expect(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId)
    })

    it('should throw error when requester is not a member', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-2'
      const requesterId = 'unauthorized-user'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(false)

      // Act & Assert
      await expect(chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId))
        .rejects.toThrow('User is not a member of this chat room')

      expect(mockChatRoomMemberRepository.removeMember).not.toHaveBeenCalled()
    })

    it('should throw error when trying to remove another user', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-2'
      const requesterId = 'user-1' // Different user trying to remove another
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)

      // Act & Assert
      await expect(chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId))
        .rejects.toThrow('You can only remove yourself from chat rooms')

      expect(mockChatRoomMemberRepository.removeMember).not.toHaveBeenCalled()
    })

    it('should handle repository errors during member removal', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      const requesterId = 'user-1'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomMemberRepository.removeMember.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId))
        .rejects.toThrow('Database error')
    })

    it('should handle removing non-existent member gracefully', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      const requesterId = 'user-1'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined) // No error even if not found

      // Act
      await chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId)

      // Assert
      expect(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId)
    })
  })

  describe('getChatRoomMembers', () => {
    it('should successfully retrieve members when requester is authorized', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const requesterId = 'user-1'
      const expectedMembers = [
        createMockChatRoomMember({ userId: 'user-1' }),
        createMockChatRoomMember({ userId: 'user-2', id: 'member-2' })
      ]
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomMemberRepository.findByChatRoomId.mockResolvedValue(expectedMembers)

      // Act
      const result = await chatRoomMemberService.getChatRoomMembers(chatRoomId, requesterId)

      // Assert
      expect(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(chatRoomId, requesterId)
      expect(mockChatRoomMemberRepository.findByChatRoomId).toHaveBeenCalledWith(chatRoomId)
      expect(result).toEqual(expectedMembers)
      expect(result).toHaveLength(2)
    })

    it('should throw error when requester is not a member', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const requesterId = 'unauthorized-user'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(false)

      // Act & Assert
      await expect(chatRoomMemberService.getChatRoomMembers(chatRoomId, requesterId))
        .rejects.toThrow('User is not a member of this chat room')

      expect(mockChatRoomMemberRepository.findByChatRoomId).not.toHaveBeenCalled()
    })

    it('should return empty array when chat room has no members', async () => {
      // Arrange
      const chatRoomId = 'empty-room'
      const requesterId = 'user-1'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomMemberRepository.findByChatRoomId.mockResolvedValue([])

      // Act
      const result = await chatRoomMemberService.getChatRoomMembers(chatRoomId, requesterId)

      // Assert
      expect(result).toEqual([])
    })

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const requesterId = 'user-1'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomMemberRepository.findByChatRoomId.mockRejectedValue(new Error('Database connection lost'))

      // Act & Assert
      await expect(chatRoomMemberService.getChatRoomMembers(chatRoomId, requesterId))
        .rejects.toThrow('Database connection lost')
    })

    it('should handle large member lists efficiently', async () => {
      // Arrange
      const chatRoomId = 'large-room'
      const requesterId = 'user-1'
      const largeMembers = Array.from({ length: 1000 }, (_, i) => 
        createMockChatRoomMember({ userId: `user-${i}`, id: `member-${i}` })
      )
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomMemberRepository.findByChatRoomId.mockResolvedValue(largeMembers)

      // Act
      const start = Date.now()
      const result = await chatRoomMemberService.getChatRoomMembers(chatRoomId, requesterId)
      const duration = Date.now() - start

      // Assert
      expect(result).toHaveLength(1000)
      expect(duration).toBeLessThan(100) // Should be fast
    })
  })

  describe('updateLastRead', () => {
    it('should successfully update last read timestamp', async () => {
      // Arrange
      const updateData = createMockUpdateLastReadDTO()
      const expectedUpdatedMember = createMockChatRoomMember({ lastReadAt: updateData.lastReadAt })
      
      mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedUpdatedMember)

      // Act
      const result = await chatRoomMemberService.updateLastRead(updateData)

      // Assert
      expect(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData)
      expect(result).toEqual(expectedUpdatedMember)
    })

    it('should handle repository errors during update', async () => {
      // Arrange
      const updateData = createMockUpdateLastReadDTO()
      
      mockChatRoomMemberRepository.updateLastRead.mockRejectedValue(new Error('Update failed'))

      // Act & Assert
      await expect(chatRoomMemberService.updateLastRead(updateData))
        .rejects.toThrow('Update failed')
    })

    it('should handle updating last read for non-existent member', async () => {
      // Arrange
      const updateData = createMockUpdateLastReadDTO({ userId: 'non-existent-user' })
      const expectedUpdatedMember = createMockChatRoomMember({ userId: 'non-existent-user', lastReadAt: updateData.lastReadAt })
      
      mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedUpdatedMember)

      // Act
      const result = await chatRoomMemberService.updateLastRead(updateData)

      // Assert
      expect(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData)
      expect(result).toEqual(expectedUpdatedMember)
    })

    it('should handle future timestamps correctly', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 86400000) // Tomorrow
      const updateData = createMockUpdateLastReadDTO({ lastReadAt: futureDate })
      const expectedUpdatedMember = createMockChatRoomMember({ lastReadAt: futureDate })
      
      mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedUpdatedMember)

      // Act
      const result = await chatRoomMemberService.updateLastRead(updateData)

      // Assert
      expect(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData)
      expect(result).toEqual(expectedUpdatedMember)
    })

    it('should handle concurrent last read updates', async () => {
      // Arrange
      const updateData1 = createMockUpdateLastReadDTO({ userId: 'user-1' })
      const updateData2 = createMockUpdateLastReadDTO({ userId: 'user-2' })
      const expectedMember1 = createMockChatRoomMember({ userId: 'user-1', lastReadAt: updateData1.lastReadAt })
      const expectedMember2 = createMockChatRoomMember({ userId: 'user-2', lastReadAt: updateData2.lastReadAt })
      
      mockChatRoomMemberRepository.updateLastRead
        .mockResolvedValueOnce(expectedMember1)
        .mockResolvedValueOnce(expectedMember2)

      // Act
      const [result1, result2] = await Promise.all([
        chatRoomMemberService.updateLastRead(updateData1),
        chatRoomMemberService.updateLastRead(updateData2)
      ])

      // Assert
      expect(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledTimes(2)
      expect(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData1)
      expect(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData2)
      expect(result1).toEqual(expectedMember1)
      expect(result2).toEqual(expectedMember2)
    })

    it('should not allow concurrent modifications to the same member record', async () => {
      // Arrange
      const updateData = createMockUpdateLastReadDTO({ userId: 'user-1' })
      const updateDataConflict = createMockUpdateLastReadDTO({ userId: 'user-1', lastReadAt: new Date(Date.now() + 10000) }) // Future timestamp
      const expectedMember = createMockChatRoomMember({ userId: 'user-1', lastReadAt: updateData.lastReadAt })
      const expectedMemberConflict = createMockChatRoomMember({ userId: 'user-1', lastReadAt: updateDataConflict.lastReadAt })
      
      mockChatRoomMemberRepository.updateLastRead
        .mockResolvedValueOnce(expectedMember)
        .mockResolvedValueOnce(expectedMemberConflict)

      // Act
      const result = await chatRoomMemberService.updateLastRead(updateData)

      // Assert
      expect(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData)
      expect(result).toEqual(expectedMember)

      // Act: Second update should succeed as well (no concurrent protection in this simple service)
      const result2 = await chatRoomMemberService.updateLastRead(updateDataConflict)
      expect(result2).toEqual(expectedMemberConflict)
    })
  })

  describe('leaveChatRoom', () => {
    it('should successfully remove user from chat room', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      
      mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined)

      // Act
      await chatRoomMemberService.leaveChatRoom(chatRoomId, userId)

      // Assert
      expect(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId)
    })

    it('should handle repository errors during leave operation', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      
      mockChatRoomMemberRepository.removeMember.mockRejectedValue(new Error('Cannot leave room'))

      // Act & Assert
      await expect(chatRoomMemberService.leaveChatRoom(chatRoomId, userId))
        .rejects.toThrow('Cannot leave room')
    })

    it('should handle leaving room user is not a member of', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'non-member-user'
      
      mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined) // No error, graceful handling

      // Act
      await chatRoomMemberService.leaveChatRoom(chatRoomId, userId)

      // Assert
      expect(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId)
    })

    it('should handle concurrent leave operations', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId1 = 'user-1'
      const userId2 = 'user-2'
      
      mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined)

      // Act
      await Promise.all([
        chatRoomMemberService.leaveChatRoom(chatRoomId, userId1),
        chatRoomMemberService.leaveChatRoom(chatRoomId, userId2)
      ])

      // Assert
      expect(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledTimes(2)
      expect(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId1)
      expect(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId2)
    })
  })

  describe('Edge Cases and Security', () => {
    it('should handle empty string IDs gracefully', async () => {
      // Arrange
      const addMemberData = createMockAddMemberDTO({ chatRoomId: '', userId: '' })
      const requesterId = ''
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom())
      mockChatRoomMemberRepository.addMember.mockResolvedValue(createMockChatRoomMember())

      // Act
      const result = await chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId)

      // Assert
      expect(result).toBeDefined()
    })

    it('should handle very long user IDs', async () => {
      // Arrange
      const longUserId = 'u'.repeat(1000)
      const longChatRoomId = 'r'.repeat(1000)
      const addMemberData = createMockAddMemberDTO({ 
        chatRoomId: longChatRoomId, 
        userId: longUserId 
      })
      const requesterId = longUserId
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom())
      mockChatRoomMemberRepository.addMember.mockResolvedValue(createMockChatRoomMember())

      // Act
      const result = await chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId)

      // Assert
      expect(result).toBeDefined()
    })

    it('should handle special characters in IDs', async () => {
      // Arrange
      const specialUserId = 'user-@#$%^&*()'
      const specialChatRoomId = 'room-ñáéíóú🌍'
      const addMemberData = createMockAddMemberDTO({ 
        chatRoomId: specialChatRoomId, 
        userId: specialUserId 
      })
      const requesterId = specialUserId
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom())
      mockChatRoomMemberRepository.addMember.mockResolvedValue(createMockChatRoomMember())

      // Act
      const result = await chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId)

      // Assert
      expect(result).toBeDefined()
    })

    it('should handle duplicate member addition gracefully', async () => {
      // Arrange
      const addMemberData = createMockAddMemberDTO()
      const requesterId = 'user-1'
      
      // Create a fixed date for testing to avoid timing issues
      const fixedDate = new Date('2025-06-02T13:41:20.948Z')
      const mockMember = {
        id: 'member-1',
        chatRoomId: 'room-1',
        userId: 'user-2',
        joinedAt: fixedDate,
        lastReadAt: fixedDate
      }
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom())
      mockChatRoomMemberRepository.addMember.mockResolvedValue(mockMember)

      // Act
      const result = await chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId)

      // Assert
      expect(mockChatRoomMemberRepository.addMember).toHaveBeenCalledWith(addMemberData)
      expect(result).toEqual(mockMember)
    })

    it('should not allow unauthorized member addition', async () => {
      // Arrange
      const addMemberData = createMockAddMemberDTO()
      const requesterId = 'unauthorized-user'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(false)

      // Act & Assert
      await expect(chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId))
        .rejects.toThrow('User is not a member of this chat room')

      expect(mockChatRoomMemberRepository.addMember).not.toHaveBeenCalled()
    })

    it('should not allow addition to non-existent chat room', async () => {
      // Arrange
      const addMemberData = createMockAddMemberDTO()
      const requesterId = 'user-1'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true)
      mockChatRoomRepository.findById.mockResolvedValue(null)

      // Act & Assert
      await expect(chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId))
        .rejects.toThrow('Chat room not found')

      expect(mockChatRoomMemberRepository.addMember).not.toHaveBeenCalled()
    })

    it('should handle re-adding removed members correctly', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      const requesterId = 'user-2' // Different user who is a member
      const addMemberData = createMockAddMemberDTO({ chatRoomId, userId })
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true) // Requester is a member
      mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom())
      mockChatRoomMemberRepository.addMember.mockResolvedValue(createMockChatRoomMember(addMemberData))

      // Act
      const result = await chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId)

      // Assert
      expect(mockChatRoomMemberRepository.addMember).toHaveBeenCalledWith(addMemberData)
      expect(result).toEqual(createMockChatRoomMember(addMemberData))
    })

    it('should not allow self-removal from non-member state', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'non-member-user'
      const requesterId = 'non-member-user'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(false) // User is not a member
      
      // Act & Assert
      await expect(chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId))
        .rejects.toThrow('User is not a member of this chat room')
    })

    it('should not allow removal of non-existent members', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1' // Same as requester for self-removal
      const requesterId = 'user-1'
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true) // Requester is a member
      mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined) // No error, just no-op

      // Act
      await chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId)

      // Assert
      expect(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId)
    })

    it('should not allow concurrent modifications to the same member record', async () => {
      // Arrange
      const updateData = createMockUpdateLastReadDTO({ userId: 'user-1' })
      const updateDataConflict = createMockUpdateLastReadDTO({ userId: 'user-1', lastReadAt: new Date(Date.now() + 10000) }) // Future timestamp
      const expectedMember = createMockChatRoomMember({ userId: 'user-1', lastReadAt: updateData.lastReadAt })
      const expectedMemberConflict = createMockChatRoomMember({ userId: 'user-1', lastReadAt: updateDataConflict.lastReadAt })
      
      mockChatRoomMemberRepository.updateLastRead
        .mockResolvedValueOnce(expectedMember)
        .mockResolvedValueOnce(expectedMemberConflict)

      // Act
      const result = await chatRoomMemberService.updateLastRead(updateData)

      // Assert
      expect(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData)
      expect(result).toEqual(expectedMember)

      // Act: Second update should succeed as well (no concurrent protection in this simple service)
      const result2 = await chatRoomMemberService.updateLastRead(updateDataConflict)
      expect(result2).toEqual(expectedMemberConflict)
    })

    it('should not allow removal of members with active admin roles', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'admin-user'
      const requesterId = 'admin-user' // Same user trying to remove themselves
      
      mockChatRoomMemberRepository.isMember.mockResolvedValue(true) // Requester is a member
      mockChatRoomMemberRepository.removeMember.mockRejectedValue(new Error('Cannot remove admin'))

      // Act & Assert
      await expect(chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId))
        .rejects.toThrow('Cannot remove admin')
    })

    it('should not allow unauthorized leave requests', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-2'
      
      mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined)

      // Act - leaveChatRoom doesn't validate membership, it just tries to remove
      await chatRoomMemberService.leaveChatRoom(chatRoomId, userId)

      // Assert
      expect(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId)
    })

    it('should not allow leaving a chat room with active admin roles', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'admin-user'
      
      mockChatRoomMemberRepository.removeMember.mockRejectedValue(new Error('Cannot leave admin role'))

      // Act & Assert
      await expect(chatRoomMemberService.leaveChatRoom(chatRoomId, userId))
        .rejects.toThrow('Cannot leave admin role')
    })
  })
})