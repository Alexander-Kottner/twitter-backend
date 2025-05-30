import { ChatRoomMemberRepository } from '../repository/chat-room-member.repository'
import { ChatRoomRepository } from '../repository/chat-room.repository'
import { AddMemberToChatRoomDTO, ChatRoomMemberDTO, UpdateLastReadDTO } from '../dto/chat-room-member.dto'

export class ChatRoomMemberService {
  constructor (
    private readonly chatRoomMemberRepository: ChatRoomMemberRepository,
    private readonly chatRoomRepository: ChatRoomRepository
  ) {}

  async addMemberToChatRoom (data: AddMemberToChatRoomDTO, requesterId: string): Promise<ChatRoomMemberDTO> {
    // Validate that the requester is a member of the chat room
    await this.validateMembership(data.chatRoomId, requesterId)

    // Validate that the chat room exists
    await this.validateChatRoomExists(data.chatRoomId)

    return await this.chatRoomMemberRepository.addMember(data)
  }

  async removeMemberFromChatRoom (chatRoomId: string, userId: string, requesterId: string): Promise<void> {
    // Validate that the requester is a member of the chat room
    await this.validateMembership(chatRoomId, requesterId)

    // Allow users to remove themselves, or validate admin permissions for removing others
    if (userId !== requesterId) {
      // In a more complex system, you'd check if requester is an admin
      throw new Error('You can only remove yourself from chat rooms')
    }

    await this.chatRoomMemberRepository.removeMember(chatRoomId, userId)
  }

  async getChatRoomMembers (chatRoomId: string, requesterId: string): Promise<ChatRoomMemberDTO[]> {
    // Validate that the requester is a member of the chat room
    await this.validateMembership(chatRoomId, requesterId)

    return await this.chatRoomMemberRepository.findByChatRoomId(chatRoomId)
  }

  async updateLastRead (data: UpdateLastReadDTO): Promise<void> {
    await this.chatRoomMemberRepository.updateLastRead(data)
  }

  async leaveChatRoom (chatRoomId: string, userId: string): Promise<void> {
    await this.chatRoomMemberRepository.removeMember(chatRoomId, userId)
  }

  private async validateChatRoomExists (chatRoomId: string): Promise<void> {
    const chatRoom = await this.chatRoomRepository.findById(chatRoomId)
    if (!chatRoom) {
      throw new Error('Chat room not found')
    }
  }

  private async validateMembership (chatRoomId: string, userId: string): Promise<void> {
    const isMember = await this.chatRoomMemberRepository.isMember(chatRoomId, userId)
    if (!isMember) {
      throw new Error('User is not a member of this chat room')
    }
  }
}