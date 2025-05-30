import { ChatRoomService } from './chat-room.service'
import { ChatRoomMemberService } from './chat-room-member.service'
import { MessageService } from './message.service'
import { FollowerRepository } from '@domains/follower/repository/follower.repository'
import { CreateMessageDTO, MessageResponseDTO } from '../dto/message.dto'
import { CreateChatRoomDTO, ChatRoomDTO, ChatRoomSummaryDTO } from '../dto/chat-room.dto'
import { ChatRoomMemberDTO } from '../dto/chat-room-member.dto'

export class ChatService {
  constructor (
    private readonly chatRoomService: ChatRoomService,
    private readonly chatRoomMemberService: ChatRoomMemberService,
    private readonly messageService: MessageService,
    private readonly followerRepository: FollowerRepository
  ) {}

  // Chat Room Operations
  async createChatRoom (data: CreateChatRoomDTO, requesterId: string): Promise<ChatRoomDTO> {
    // Update the chat room service to use the follower repository
    const updatedChatRoomService = this.createUpdatedChatRoomService()
    return await updatedChatRoomService.createChatRoom(data, requesterId)
  }

  async findOrCreateDMChatRoom (user1Id: string, user2Id: string): Promise<ChatRoomDTO> {
    // Validate mutual follow relationship
    await this.validateMutualFollow(user1Id, user2Id)

    const updatedChatRoomService = this.createUpdatedChatRoomService()
    return await updatedChatRoomService.findOrCreateDMChatRoom(user1Id, user2Id)
  }

  async getUserChatRooms (userId: string): Promise<ChatRoomSummaryDTO[]> {
    return await this.chatRoomService.getUserChatRooms(userId)
  }

  // Message Operations
  async sendMessage (data: CreateMessageDTO): Promise<MessageResponseDTO> {
    return await this.messageService.createMessage(data)
  }

  async getChatRoomMessages (chatRoomId: string, userId: string, limit?: number, cursor?: string): Promise<any[]> {
    return await this.messageService.getChatRoomMessages({ chatRoomId, limit, cursor }, userId)
  }

  // Member Operations - CRITICAL FIX: Pass actual userId instead of chatRoomId
  async getChatRoomMembers (chatRoomId: string, userId?: string): Promise<ChatRoomMemberDTO[]> {
    // If userId is not provided, this is an internal call from Socket.IO
    // We'll skip validation for internal calls and directly access the repository
    if (!userId) {
      // For internal calls (e.g., from Socket.IO), bypass validation
      return await this.chatRoomMemberService['chatRoomMemberRepository'].findByChatRoomId(chatRoomId)
    }
    
    return await this.chatRoomMemberService.getChatRoomMembers(chatRoomId, userId)
  }

  async validateChatRoomMembership (chatRoomId: string, userId: string): Promise<boolean> {
    try {
      const members = await this.chatRoomMemberService.getChatRoomMembers(chatRoomId, userId)
      return members.some(member => member.userId === userId)
    } catch (error) {
      return false
    }
  }

  // CRITICAL FIX: Implement actual unread count calculation
  async getUnreadCount (chatRoomId: string, userId: string): Promise<number> {
    return await this.chatRoomService.getUnreadCountForUser(chatRoomId, userId)
  }

  // ENHANCEMENT: Add method to update last read for a user in a chat room
  async updateLastRead(chatRoomId: string, userId: string): Promise<void> {
    await this.chatRoomMemberService.updateLastRead({
      chatRoomId,
      userId,
      lastReadAt: new Date()
    })
  }

  // Security: Mutual Follow Validation
  private async validateMutualFollow (user1Id: string, user2Id: string): Promise<void> {
    const user1FollowsUser2 = await this.followerRepository.isFollowing(user1Id, user2Id)
    const user2FollowsUser1 = await this.followerRepository.isFollowing(user2Id, user1Id)

    if (!user1FollowsUser2 || !user2FollowsUser1) {
      throw new Error('Users must follow each other to chat')
    }
  }

  private async validateMutualFollowsForGroup (memberIds: string[]): Promise<void> {
    // Validate that all members follow each other (mutual follows)
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        await this.validateMutualFollow(memberIds[i], memberIds[j])
      }
    }
  }

  // Helper to create an updated chat room service with follower validation
  private createUpdatedChatRoomService (): any {
    // Create a wrapper that includes the mutual follow validation
    return {
      createChatRoom: async (data: CreateChatRoomDTO, requesterId: string) => {
        // Validate mutual follows before creating
        await this.validateMutualFollowsForGroup(data.memberIds)
        return await this.chatRoomService.createChatRoom(data, requesterId)
      },
      findOrCreateDMChatRoom: async (user1Id: string, user2Id: string) => {
        // Already validated in the main method
        return await this.chatRoomService.findOrCreateDMChatRoom(user1Id, user2Id)
      }
    }
  }
}