import { ChatService } from './chat.service'
import { ChatRoomService } from './chat-room.service'
import { MessageService } from './message.service'
import { ChatRoomMemberService } from './chat-room-member.service'
import { ChatRoomDTO, ChatRoomType } from '../dto/chat-room.dto'
import { MessageDTO, MessageType, MessageResponseDTO } from '../dto/message.dto'
import { ChatRoomMemberDTO } from '../dto/chat-room-member.dto'
import { FollowerRepository } from '@domains/follower/repository/follower.repository'
import { jest, describe, it, expect, beforeEach} from '@jest/globals'

describe('ChatService', () => {
  let chatService: ChatService
  let mockChatRoomService: jest.Mocked<ChatRoomService>
  let mockMessageService: jest.Mocked<MessageService>
  let mockChatRoomMemberService: jest.Mocked<ChatRoomMemberService>
  let mockFollowerRepository: jest.Mocked<FollowerRepository>

  const mockChatRoom: ChatRoomDTO = {
    id: 'room-1',
    name: 'Test Room',
    type: ChatRoomType.GROUP,
    createdAt: new Date(),
    updatedAt: new Date()
  }

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

  const mockChatRoomMember: ChatRoomMemberDTO = {
    id: 'member-1',
    chatRoomId: 'room-1',
    userId: 'user-1',
    joinedAt: new Date(),
    lastReadAt: new Date()
  }

  beforeEach(async () => {
    mockChatRoomService = {
      createChatRoom: jest.fn(),
      getChatRoom: jest.fn(),
      getUserChatRooms: jest.fn(),
      findOrCreateDMChatRoom: jest.fn(),
      updateChatRoom: jest.fn(),
      deleteChatRoom: jest.fn(),
      getUnreadCountForUser: jest.fn()
    } as any

    mockMessageService = {
      createMessage: jest.fn(),
      getChatRoomMessages: jest.fn(),
      getMessage: jest.fn(),
      updateMessage: jest.fn()
    } as any

    mockChatRoomMemberService = {
      addMemberToChatRoom: jest.fn(),
      removeMemberFromChatRoom: jest.fn(),
      getChatRoomMembers: jest.fn(),
      updateLastRead: jest.fn(),
      leaveChatRoom: jest.fn()
    } as any

    mockFollowerRepository = {
      isFollowing: jest.fn(),
      follow: jest.fn(),
      unfollow: jest.fn()
    } as any

    // Setup default successful follower validations
    mockFollowerRepository.isFollowing.mockResolvedValue(true)

    chatService = new ChatService(
      mockChatRoomService,
      mockChatRoomMemberService,
      mockMessageService,
      mockFollowerRepository
    )
  })

  describe('createChatRoom', () => {
    it('should successfully create chat room with mutual follow validation', async () => {
      // Arrange
      const createData = {
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        memberIds: ['user-1', 'user-2']
      }
      const requesterId = 'user-1'
      const expectedRoom = {
        id: 'room-1',
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockChatRoomService.createChatRoom.mockResolvedValue(expectedRoom)

      // Act
      const result = await chatService.createChatRoom(createData, requesterId)

      // Assert
      expect(mockChatRoomService.createChatRoom).toHaveBeenCalledWith(createData, requesterId)
      expect(result).toEqual(expectedRoom)
    })

    it('should throw error when users do not follow each other mutually', async () => {
      // Arrange
      const createData = {
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        memberIds: ['user-1', 'user-2']
      }
      const requesterId = 'user-1'
      
      // Mock that users don't follow each other
      mockFollowerRepository.isFollowing.mockResolvedValue(false)

      // Act & Assert
      await expect(chatService.createChatRoom(createData, requesterId))
        .rejects.toThrow('Users must follow each other to chat')
    })

    it('should handle large groups with optimized mutual follow validation', async () => {
      // Arrange
      const memberIds = ['user-1', 'user-2', 'user-3', 'user-4']
      const createData = {
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        memberIds
      }
      const requesterId = 'user-1'
      const expectedRoom = {
        id: 'room-1',
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockChatRoomService.createChatRoom.mockResolvedValue(expectedRoom)

      // Act
      const result = await chatService.createChatRoom(createData, requesterId)

      // Assert
      // For 4 users: 6 pairs × 2 directions = 12 follower checks
      expect(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(12)
      expect(result).toEqual(expectedRoom)
    })

    it('should handle empty member lists gracefully', async () => {
      // Arrange
      const createData = {
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        memberIds: []
      }
      const requesterId = 'user-1'
      
      mockChatRoomService.createChatRoom.mockResolvedValue({
        id: 'room-1',
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Act
      const result = await chatService.createChatRoom(createData, requesterId)

      // Assert
      expect(mockChatRoomService.createChatRoom).toHaveBeenCalledWith(createData, requesterId)
      expect(result).toBeDefined()
    })
  })

  describe('findOrCreateDMChatRoom', () => {
    it('should successfully create DM when users follow each other', async () => {
      // Arrange
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      const expectedRoom = {
        id: 'room-1',
        name: 'Test Room',
        type: ChatRoomType.DM,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockChatRoomService.findOrCreateDMChatRoom.mockResolvedValue(expectedRoom)

      // Act
      const result = await chatService.findOrCreateDMChatRoom(user1Id, user2Id)

      // Assert
      expect(mockChatRoomService.findOrCreateDMChatRoom).toHaveBeenCalledWith(user1Id, user2Id)
      expect(result).toEqual(expectedRoom)
    })

    it('should throw error when users do not follow each other', async () => {
      // Arrange
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      
      // Mock that users don't follow each other
      mockFollowerRepository.isFollowing.mockResolvedValue(false)

      // Act & Assert
      await expect(chatService.findOrCreateDMChatRoom(user1Id, user2Id))
        .rejects.toThrow('Users must follow each other to chat')

      expect(mockChatRoomService.findOrCreateDMChatRoom).not.toHaveBeenCalled()
    })

    it('should find existing DM when it already exists', async () => {
      // Arrange
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      const existingRoom = {
        id: 'existing-dm',
        name: 'Existing DM',
        type: ChatRoomType.DM,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockChatRoomService.findOrCreateDMChatRoom.mockResolvedValue(existingRoom)

      // Act
      const result = await chatService.findOrCreateDMChatRoom(user1Id, user2Id)

      // Assert
      expect(result.id).toBe('existing-dm')
      expect(result.type).toBe(ChatRoomType.DM)
    })

    it('should handle follower repository errors gracefully', async () => {
      // Arrange
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      
      mockFollowerRepository.isFollowing.mockRejectedValue(new Error('Follower service unavailable'))

      // Act & Assert
      await expect(chatService.findOrCreateDMChatRoom(user1Id, user2Id))
        .rejects.toThrow('Follower service unavailable')

      expect(mockChatRoomService.findOrCreateDMChatRoom).not.toHaveBeenCalled()
    })
  })

  describe('getUserChatRooms', () => {
    it('should successfully retrieve user chat rooms', async () => {
      // Arrange
      const userId = 'user-1'
      const expectedRooms = [
        {
          id: 'room-1',
          name: 'Room 1',
          type: ChatRoomType.GROUP,
          memberCount: 2,
          unreadCount: 0,
          lastMessage: undefined
        },
        {
          id: 'room-2',
          name: 'Room 2',
          type: ChatRoomType.GROUP,
          memberCount: 3,
          unreadCount: 5,
          lastMessage: undefined
        }
      ]
      
      mockChatRoomService.getUserChatRooms.mockResolvedValue(expectedRooms)

      // Act
      const result = await chatService.getUserChatRooms(userId)

      // Assert
      expect(mockChatRoomService.getUserChatRooms).toHaveBeenCalledWith(userId)
      expect(result).toEqual(expectedRooms)
      expect(result).toHaveLength(2)
    })

    it('should handle empty chat room list', async () => {
      // Arrange
      const userId = 'user-with-no-rooms'
      
      mockChatRoomService.getUserChatRooms.mockResolvedValue([])

      // Act
      const result = await chatService.getUserChatRooms(userId)

      // Assert
      expect(result).toEqual([])
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const userId = 'user-1'
      
      mockChatRoomService.getUserChatRooms.mockRejectedValue(new Error('Service unavailable'))

      // Act & Assert
      await expect(chatService.getUserChatRooms(userId))
        .rejects.toThrow('Service unavailable')
    })
  })

  describe('sendMessage', () => {
    it('should successfully send message', async () => {
      // Arrange
      const messageData = {
        content: 'Test message',
        authorId: 'user-1',
        chatRoomId: 'room-1'
      }
      const expectedResponse = new MessageResponseDTO({
        message: {
          id: 'msg-1',
          content: 'Test message',
          authorId: 'user-1',
          chatRoomId: 'room-1',
          type: MessageType.TEXT,
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        chatRoom: {
          id: 'room-1',
          name: 'Test Room',
          type: 'GROUP'
        }
      })
      
      mockMessageService.createMessage.mockResolvedValue(expectedResponse)

      // Act
      const result = await chatService.sendMessage(messageData)

      // Assert
      expect(mockMessageService.createMessage).toHaveBeenCalledWith(messageData)
      expect(result).toEqual(expectedResponse)
    })

    it('should handle message creation errors', async () => {
      // Arrange
      const messageData = {
        content: 'Test message',
        authorId: 'user-1',
        chatRoomId: 'room-1'
      }
      
      mockMessageService.createMessage.mockRejectedValue(new Error('Message validation failed'))

      // Act & Assert
      await expect(chatService.sendMessage(messageData))
        .rejects.toThrow('Message validation failed')
    })

    it('should handle empty message content', async () => {
      // Arrange
      const messageData = {
        content: '',
        authorId: 'user-1',
        chatRoomId: 'room-1'
      }
      
      mockMessageService.createMessage.mockRejectedValue(new Error('Message content cannot be empty'))

      // Act & Assert
      await expect(chatService.sendMessage(messageData))
        .rejects.toThrow('Message content cannot be empty')
    })

    it('should handle unauthorized message sending', async () => {
      // Arrange
      const messageData = {
        content: 'Test message',
        authorId: 'unauthorized-user',
        chatRoomId: 'room-1'
      }
      
      mockMessageService.createMessage.mockRejectedValue(new Error('User is not a member of this chat room'))

      // Act & Assert
      await expect(chatService.sendMessage(messageData))
        .rejects.toThrow('User is not a member of this chat room')
    })
  })

  describe('getChatRoomMessages', () => {
    it('should successfully retrieve chat room messages', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      const limit = 20
      const cursor = 'cursor-123'
      const expectedMessages = [
        { id: 'msg-1', content: 'Message 1' },
        { id: 'msg-2', content: 'Message 2' }
      ]
      
      mockMessageService.getChatRoomMessages.mockResolvedValue(expectedMessages as any)

      // Act
      const result = await chatService.getChatRoomMessages(chatRoomId, userId, limit, cursor)

      // Assert
      expect(mockMessageService.getChatRoomMessages).toHaveBeenCalledWith(
        { chatRoomId, limit, cursor },
        userId
      )
      expect(result).toEqual(expectedMessages)
    })

    it('should handle default pagination parameters', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      
      mockMessageService.getChatRoomMessages.mockResolvedValue([])

      // Act
      await chatService.getChatRoomMessages(chatRoomId, userId)

      // Assert
      expect(mockMessageService.getChatRoomMessages).toHaveBeenCalledWith(
        { chatRoomId, limit: undefined, cursor: undefined },
        userId
      )
    })

    it('should handle unauthorized access', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'unauthorized-user'
      
      mockMessageService.getChatRoomMessages.mockRejectedValue(new Error('User is not a member of this chat room'))

      // Act & Assert
      await expect(chatService.getChatRoomMessages(chatRoomId, userId))
        .rejects.toThrow('User is not a member of this chat room')
    })

    it('should handle empty message history', async () => {
      // Arrange
      const chatRoomId = 'empty-room'
      const userId = 'user-1'
      
      mockMessageService.getChatRoomMessages.mockResolvedValue([])

      // Act
      const result = await chatService.getChatRoomMessages(chatRoomId, userId)

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('getChatRoomMembers', () => {
    it('should successfully retrieve members when userId is provided', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      const expectedMembers = [
        {
          id: 'member-1',
          chatRoomId: 'room-1',
          userId: 'user-1',
          joinedAt: new Date(),
          lastReadAt: new Date()
        },
        {
          id: 'member-2',
          chatRoomId: 'room-1',
          userId: 'user-2',
          joinedAt: new Date(),
          lastReadAt: new Date()
        }
      ]
      
      mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue(expectedMembers)

      // Act
      const result = await chatService.getChatRoomMembers(chatRoomId, userId)

      // Assert
      expect(mockChatRoomMemberService.getChatRoomMembers).toHaveBeenCalledWith(chatRoomId, userId)
      expect(result).toEqual(expectedMembers)
    })

    it('should bypass validation for internal calls (no userId)', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const expectedMembers = [
        {
          id: 'member-1',
          chatRoomId: 'room-1',
          userId: 'user-1',
          joinedAt: new Date(),
          lastReadAt: new Date()
        },
        {
          id: 'member-2',
          chatRoomId: 'room-1',
          userId: 'user-2',
          joinedAt: new Date(),
          lastReadAt: new Date()
        }
      ]
      
      // For internal calls, we expect the service to call getChatRoomMembers with 'INTERNAL_BYPASS'
      mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue(expectedMembers)

      // Act
      const result = await chatService.getChatRoomMembers(chatRoomId)

      // Assert
      expect(mockChatRoomMemberService.getChatRoomMembers).toHaveBeenCalledWith(chatRoomId, 'INTERNAL_BYPASS')
      expect(result).toEqual(expectedMembers)
    })

    it('should handle unauthorized access with userId', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'unauthorized-user'
      
      mockChatRoomMemberService.getChatRoomMembers.mockRejectedValue(new Error('User is not a member of this chat room'))

      // Act & Assert
      await expect(chatService.getChatRoomMembers(chatRoomId, userId))
        .rejects.toThrow('User is not a member of this chat room')
    })

    it('should handle empty member list', async () => {
      // Arrange
      const chatRoomId = 'empty-room'
      const userId = 'user-1'
      
      mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue([])

      // Act
      const result = await chatService.getChatRoomMembers(chatRoomId, userId)

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('validateChatRoomMembership', () => {
    it('should return true when user is a member', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      const members = [mockChatRoomMember]
      
      mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue(members)

      // Act
      const result = await chatService.validateChatRoomMembership(chatRoomId, userId)

      // Assert
      expect(result).toBe(true)
      expect(mockChatRoomMemberService.getChatRoomMembers).toHaveBeenCalledWith(chatRoomId, userId)
    })

    it('should return false when user is not a member', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      const members = [{
        id: 'member-2',
        chatRoomId: 'room-1',
        userId: 'user-2',
        joinedAt: new Date(),
        lastReadAt: new Date()
      }]
      
      mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue(members)

      // Act
      const result = await chatService.validateChatRoomMembership(chatRoomId, userId)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false when service throws error', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      
      mockChatRoomMemberService.getChatRoomMembers.mockRejectedValue(new Error('Service error'))

      // Act
      const result = await chatService.validateChatRoomMembership(chatRoomId, userId)

      // Assert
      expect(result).toBe(false)
    })

    it('should handle empty member list gracefully', async () => {
      // Arrange
      const chatRoomId = 'empty-room'
      const userId = 'user-1'
      
      mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue([])

      // Act
      const result = await chatService.validateChatRoomMembership(chatRoomId, userId)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('getUnreadCount', () => {
    it('should successfully return unread count', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      const expectedCount = 5
      
      mockChatRoomService.getUnreadCountForUser.mockResolvedValue(expectedCount)

      // Act
      const result = await chatService.getUnreadCount(chatRoomId, userId)

      // Assert
      expect(mockChatRoomService.getUnreadCountForUser).toHaveBeenCalledWith(chatRoomId, userId)
      expect(result).toBe(expectedCount)
    })

    it('should return zero when no unread messages', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      
      mockChatRoomService.getUnreadCountForUser.mockResolvedValue(0)

      // Act
      const result = await chatService.getUnreadCount(chatRoomId, userId)

      // Assert
      expect(result).toBe(0)
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      
      mockChatRoomService.getUnreadCountForUser.mockRejectedValue(new Error('Service unavailable'))

      // Act & Assert
      await expect(chatService.getUnreadCount(chatRoomId, userId))
        .rejects.toThrow('Service unavailable')
    })
  })

  describe('updateLastRead', () => {
    it('should successfully update last read timestamp', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      
      // Mock updateLastRead to return a valid ChatRoomMemberDTO
      const mockMember = { 
        id: 'member-1', 
        userId: 'user-1', 
        chatRoomId: 'room-1', 
        joinedAt: new Date(),
        lastReadAt: new Date()
      }
      mockChatRoomMemberService.updateLastRead.mockResolvedValue(mockMember)

      // Act
      await chatService.updateLastRead(chatRoomId, userId)

      // Assert
      expect(mockChatRoomMemberService.updateLastRead).toHaveBeenCalledWith({
        chatRoomId,
        userId,
        lastReadAt: expect.any(Date)
      })
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      
      mockChatRoomMemberService.updateLastRead.mockRejectedValue(new Error('Update failed'))

      // Act & Assert
      await expect(chatService.updateLastRead(chatRoomId, userId))
        .rejects.toThrow('Update failed')
    })

    it('should handle concurrent updates', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId1 = 'user-1'
      const userId2 = 'user-2'
      
      const mockMember1 = { 
        id: 'member-1', 
        userId: 'user-1', 
        chatRoomId: 'room-1', 
        joinedAt: new Date(),
        lastReadAt: new Date()
      }
      const mockMember2 = { 
        id: 'member-2', 
        userId: 'user-2', 
        chatRoomId: 'room-1', 
        joinedAt: new Date(),
        lastReadAt: new Date()
      }
      mockChatRoomMemberService.updateLastRead
        .mockResolvedValueOnce(mockMember1)
        .mockResolvedValueOnce(mockMember2)

      // Act
      await Promise.all([
        chatService.updateLastRead(chatRoomId, userId1),
        chatService.updateLastRead(chatRoomId, userId2)
      ])

      // Assert
      expect(mockChatRoomMemberService.updateLastRead).toHaveBeenCalledTimes(2)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete chat flow: create room, send message, read messages', async () => {
      // Arrange
      const createData = {
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        memberIds: ['user-1', 'user-2']
      }
      const requesterId = 'user-1'
      const messageData = {
        content: 'Test message',
        authorId: 'user-1',
        chatRoomId: 'room-1'
      }
      const room = {
        id: 'room-1',
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      const messageResponse = new MessageResponseDTO({
        message: {
          id: 'msg-1',
          content: 'Test message',
          authorId: 'user-1',
          chatRoomId: 'room-1',
          type: MessageType.TEXT,
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        chatRoom: {
          id: 'room-1',
          name: 'Test Room',
          type: 'GROUP'
        }
      })
      const messages = [{ id: 'msg-1', content: 'Test message' }]
      
      mockChatRoomService.createChatRoom.mockResolvedValue(room)
      mockMessageService.createMessage.mockResolvedValue(messageResponse)
      mockMessageService.getChatRoomMessages.mockResolvedValue(messages as any)

      // Act
      const createdRoom = await chatService.createChatRoom(createData, requesterId)
      const sentMessage = await chatService.sendMessage(messageData)
      const retrievedMessages = await chatService.getChatRoomMessages(room.id, requesterId)

      // Assert
      expect(createdRoom).toEqual(room)
      expect(sentMessage).toEqual(messageResponse)
      expect(retrievedMessages).toEqual(messages)
    })

    it('should handle DM creation and messaging flow', async () => {
      // Arrange
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      const dmRoom = {
        id: 'room-1',
        name: 'Test Room',
        type: ChatRoomType.DM,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      const messageData = {
        content: 'Test message',
        authorId: 'user-1',
        chatRoomId: dmRoom.id
      }
      const messageResponse = new MessageResponseDTO({
        message: {
          id: 'msg-1',
          content: 'Test message',
          authorId: 'user-1',
          chatRoomId: 'room-1',
          type: MessageType.TEXT,
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        chatRoom: {
          id: 'room-1',
          name: 'Test Room',
          type: 'GROUP'
        }
      })
      
      mockChatRoomService.findOrCreateDMChatRoom.mockResolvedValue(dmRoom)
      mockMessageService.createMessage.mockResolvedValue(messageResponse)

      // Act
      const dm = await chatService.findOrCreateDMChatRoom(user1Id, user2Id)
      const message = await chatService.sendMessage(messageData)

      // Assert
      expect(dm.type).toBe(ChatRoomType.DM)
      expect(message.message.chatRoomId).toBe(dmRoom.id)
    })

    it('should handle member management flow', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      const members = [mockChatRoomMember]
      
      mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue(members)
      const mockUpdatedMember = { 
        id: 'member-1', 
        userId: 'user-1', 
        chatRoomId: 'room-1', 
        joinedAt: new Date(),
        lastReadAt: new Date()
      }
      mockChatRoomMemberService.updateLastRead.mockResolvedValue(mockUpdatedMember)

      // Act
      const retrievedMembers = await chatService.getChatRoomMembers(chatRoomId, userId)
      const isValid = await chatService.validateChatRoomMembership(chatRoomId, userId)
      await chatService.updateLastRead(chatRoomId, userId)

      // Assert
      expect(retrievedMembers).toEqual(members)
      expect(isValid).toBe(true)
      expect(mockChatRoomMemberService.updateLastRead).toHaveBeenCalled()
    })

    it('should handle error propagation through service layers', async () => {
      // Arrange
      const createData = {
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        memberIds: ['user-1', 'user-2']
      }
      const requesterId = 'user-1'
      
      mockChatRoomService.createChatRoom.mockRejectedValue(new Error('External service down'))

      // Act & Assert
      await expect(chatService.createChatRoom(createData, requesterId))
        .rejects.toThrow('External service down')

      // Verify that the error propagated correctly
      expect(mockChatRoomService.createChatRoom).toHaveBeenCalledWith(createData, requesterId)
    })

    it('should handle partial service failures gracefully', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      
      // First call succeeds, second fails
      mockChatRoomMemberService.getChatRoomMembers
        .mockResolvedValueOnce([mockChatRoomMember])
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))

      // Act
      const firstResult = await chatService.validateChatRoomMembership(chatRoomId, userId)
      const secondResult = await chatService.validateChatRoomMembership(chatRoomId, userId)

      // Assert
      expect(firstResult).toBe(true)
      expect(secondResult).toBe(false) // Graceful failure
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle concurrent chat operations efficiently', async () => {
      // Arrange
      const operations = Array.from({ length: 10 }, (_, i) => ({
        createData: {
          name: `Room ${i}`,
          type: ChatRoomType.GROUP,
          memberIds: ['user-1', 'user-2']
        },
        requesterId: `user-${i}`
      }))
      
      mockChatRoomService.createChatRoom.mockImplementation(
        (data) => Promise.resolve({
          id: 'room-1',
          name: data.name,
          type: ChatRoomType.GROUP,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      )

      // Act
      const start = Date.now()
      const results = await Promise.all(
        operations.map(op => chatService.createChatRoom(op.createData, op.requesterId))
      )
      const duration = Date.now() - start

      // Assert
      expect(results).toHaveLength(10)
      expect(duration).toBeLessThan(500) // Should handle concurrency well
      expect(mockChatRoomService.createChatRoom).toHaveBeenCalledTimes(10)
    })

    it('should optimize follower validation for large groups', async () => {
      // Arrange
      const memberIds = Array.from({ length: 20 }, (_, i) => `user-${i}`)
      const createData = {
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        memberIds
      }
      const requesterId = 'user-0'
      
      mockChatRoomService.createChatRoom.mockResolvedValue({
        id: 'room-1',
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Act
      const start = Date.now()
      await chatService.createChatRoom(createData, requesterId)
      const duration = Date.now() - start

      // Assert
      // For 20 users: 190 pairs × 2 directions = 380 follower checks
      expect(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(380)
      expect(duration).toBeLessThan(1000) // Should be optimized
    })

    it('should handle high-frequency message sending', async () => {
      // Arrange
      const messages = Array.from({ length: 100 }, (_, i) => 
        ({
          content: `Message ${i}`,
          authorId: 'user-1',
          chatRoomId: 'room-1'
        })
      )
      
      mockMessageService.createMessage.mockImplementation(
        (data) => Promise.resolve(new MessageResponseDTO({
          message: {
            id: 'msg-1',
            content: data.content,
            authorId: data.authorId,
            chatRoomId: data.chatRoomId,
            type: MessageType.TEXT,
            isEncrypted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          chatRoom: {
            id: data.chatRoomId,
            name: 'Test Room',
            type: 'GROUP'
          }
        }))
      )

      // Act
      const start = Date.now()
      const results = await Promise.all(
        messages.map(msg => chatService.sendMessage(msg))
      )
      const duration = Date.now() - start

      // Assert
      expect(results).toHaveLength(100)
      expect(duration).toBeLessThan(1000) // Should handle high frequency
      expect(mockMessageService.createMessage).toHaveBeenCalledTimes(100)
    })
  })

  describe('Edge Cases and Security', () => {
    it('should handle malformed data gracefully', async () => {
      // Arrange
      const malformedData = { invalid: 'data' } as any
      const requesterId = 'user-1'

      // Act & Assert
      await expect(chatService.createChatRoom(malformedData, requesterId))
        .rejects.toThrow('Cannot read properties of undefined')
    })

    it('should handle very long user IDs and chat room IDs', async () => {
      // Arrange
      const longId = 'x'.repeat(10000)
      const createData = {
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        memberIds: [longId, 'user-2']
      }
      
      mockChatRoomService.createChatRoom.mockResolvedValue({
        id: 'room-1',
        name: 'Test Room',
        type: ChatRoomType.GROUP,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Act
      const result = await chatService.createChatRoom(createData, longId)

      // Assert
      expect(result).toBeDefined()
      expect(mockChatRoomService.createChatRoom).toHaveBeenCalledWith(createData, longId)
    })

    it('should maintain security boundaries between services', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const unauthorizedUserId = 'hacker'
      
      mockChatRoomMemberService.getChatRoomMembers.mockRejectedValue(
        new Error('User is not a member of this chat room')
      )

      // Act & Assert
      await expect(chatService.getChatRoomMembers(chatRoomId, unauthorizedUserId))
        .rejects.toThrow('User is not a member of this chat room')

      // Verify that authorization is checked at each layer
      expect(mockChatRoomMemberService.getChatRoomMembers).toHaveBeenCalledWith(chatRoomId, unauthorizedUserId)
    })

    it('should handle service degradation scenarios', async () => {
      // Arrange
      const chatRoomId = 'room-1'
      const userId = 'user-1'
      
      // Simulate intermittent service failures
      mockChatRoomService.getUnreadCountForUser
        .mockRejectedValueOnce(new Error('Service temporarily down'))
        .mockResolvedValueOnce(5)

      // Act & Assert
      await expect(chatService.getUnreadCount(chatRoomId, userId))
        .rejects.toThrow('Service temporarily down')

      // Subsequent call should work
      const result = await chatService.getUnreadCount(chatRoomId, userId)
      expect(result).toBe(5)
    })
  })
})