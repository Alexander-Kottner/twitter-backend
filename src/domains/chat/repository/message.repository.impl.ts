import { PrismaClient } from '@prisma/client'
import { CreateMessageDTO, MessageDTO } from '../dto/message.dto'
import { MessageRepository } from './message.repository'

export class MessageRepositoryImpl implements MessageRepository {
  constructor (private readonly db: PrismaClient) {}

  async create (data: CreateMessageDTO): Promise<MessageDTO> {
    const message = await this.db.message.create({
      data: {
        chatRoomId: data.chatRoomId,
        authorId: data.authorId,
        content: data.content,
        type: data.type,
        // ENCRYPTION: Include encryption fields if present
        ...(data.isEncrypted && {
          isEncrypted: data.isEncrypted,
          iv: data.iv,
          tag: data.tag
        })
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true
          }
        }
      }
    })
    return new MessageDTO(message)
  }

  async findById (id: string): Promise<MessageDTO | null> {
    const message = await this.db.message.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true
          }
        }
      }
    })
    return message ? new MessageDTO(message) : null
  }

  async findByChatRoomId (chatRoomId: string, limit = 50, cursor?: string): Promise<MessageDTO[]> {
    const messages = await this.db.message.findMany({
      where: { chatRoomId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1
      })
    })
    return messages.map(message => new MessageDTO(message))
  }

  async update (id: string, updateData: string | { content: string; iv?: string; tag?: string; isEncrypted?: boolean }): Promise<MessageDTO> {
    // Handle both old string format and new object format for backwards compatibility
    const data = typeof updateData === 'string' 
      ? { content: updateData }
      : updateData

    const message = await this.db.message.update({
      where: { id },
      data: {
        content: data.content,
        // ENCRYPTION: Update encryption fields if present
        ...(data.iv && { iv: data.iv }),
        ...(data.tag && { tag: data.tag }),
        ...(data.isEncrypted !== undefined && { isEncrypted: data.isEncrypted })
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true
          }
        }
      }
    })
    return new MessageDTO(message)
  }

  async delete (id: string): Promise<void> {
    await this.db.message.delete({
      where: { id }
    })
  }

  async getLastMessageForChatRoom (chatRoomId: string): Promise<MessageDTO | null> {
    const message = await this.db.message.findFirst({
      where: { chatRoomId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            profilePicture: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return message ? new MessageDTO(message) : null
  }

  async getMessageCountAfterTimestamp (chatRoomId: string, timestamp: Date): Promise<number> {
    return await this.db.message.count({
      where: {
        chatRoomId,
        createdAt: { gt: timestamp }
      }
    })
  }
}