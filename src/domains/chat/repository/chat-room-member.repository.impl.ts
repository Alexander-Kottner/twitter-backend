import { PrismaClient } from '@prisma/client'
import { AddMemberToChatRoomDTO, UpdateLastReadDTO, ChatRoomMemberDTO } from '../dto/chat-room-member.dto'
import { ChatRoomMemberRepository } from './chat-room-member.repository'

export class ChatRoomMemberRepositoryImpl implements ChatRoomMemberRepository {
  constructor (private readonly db: PrismaClient) {}

  async addMember (data: AddMemberToChatRoomDTO): Promise<ChatRoomMemberDTO> {
    const member = await this.db.chatRoomMember.create({
      data: {
        chatRoomId: data.chatRoomId,
        userId: data.userId
      }
    })
    return new ChatRoomMemberDTO(member)
  }

  async removeMember (chatRoomId: string, userId: string): Promise<void> {
    await this.db.chatRoomMember.delete({
      where: {
        chatRoomId_userId: {
          chatRoomId,
          userId
        }
      }
    })
  }

  async findByChatRoomId (chatRoomId: string): Promise<ChatRoomMemberDTO[]> {
    const members = await this.db.chatRoomMember.findMany({
      where: { chatRoomId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true
          }
        }
      }
    })
    return members.map(member => new ChatRoomMemberDTO(member))
  }

  async findByUserId (userId: string): Promise<ChatRoomMemberDTO[]> {
    const members = await this.db.chatRoomMember.findMany({
      where: { userId },
      include: {
        chatRoom: true
      }
    })
    return members.map(member => new ChatRoomMemberDTO(member))
  }

  async isMember (chatRoomId: string, userId: string): Promise<boolean> {
    const member = await this.db.chatRoomMember.findUnique({
      where: {
        chatRoomId_userId: {
          chatRoomId,
          userId
        }
      }
    })
    return !!member
  }

  async updateLastRead (data: UpdateLastReadDTO): Promise<ChatRoomMemberDTO> {
    const member = await this.db.chatRoomMember.update({
      where: {
        chatRoomId_userId: {
          chatRoomId: data.chatRoomId,
          userId: data.userId
        }
      },
      data: {
        lastReadAt: data.lastReadAt
      }
    })
    return new ChatRoomMemberDTO(member)
  }

  async getMemberCount (chatRoomId: string): Promise<number> {
    return await this.db.chatRoomMember.count({
      where: { chatRoomId }
    })
  }
}