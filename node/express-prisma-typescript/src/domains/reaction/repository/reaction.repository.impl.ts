import { PrismaClient } from '@prisma/client'
import { ReactionDTO, ReactionType } from '../dto'
import { ReactionRepository } from './reaction.repository'

export class ReactionRepositoryImpl implements ReactionRepository {
  private db: PrismaClient

  constructor (db: PrismaClient) {
    this.db = db
  }

  async create (userId: string, postId: string, type: ReactionType): Promise<ReactionDTO> {
    const reaction = await this.db.reaction.create({
      data: {
        userId,
        postId,
        type
      }
    })

    return new ReactionDTO({
      id: reaction.id,
      userId: reaction.userId,
      postId: reaction.postId,
      type: reaction.type as ReactionType,
      createdAt: reaction.createdAt
    })
  }

  async delete (userId: string, postId: string, type: ReactionType): Promise<void> {
    await this.db.reaction.deleteMany({
      where: {
        userId,
        postId,
        type,
        deletedAt: null
      }
    })
  }

  async getByPostIdAndUserId (postId: string, userId: string, type: ReactionType): Promise<ReactionDTO | null> {
    const reaction = await this.db.reaction.findFirst({
      where: {
        postId,
        userId,
        type,
        deletedAt: null
      }
    })

    if (!reaction) return null

    return new ReactionDTO({
      id: reaction.id,
      userId: reaction.userId,
      postId: reaction.postId,
      type: reaction.type as ReactionType,
      createdAt: reaction.createdAt
    })
  }

  async getCountByPostId (postId: string, type: ReactionType): Promise<number> {
    return await this.db.reaction.count({
      where: {
        postId,
        type,
        deletedAt: null
      }
    })
  }

  async getByUserId (userId: string, type: ReactionType): Promise<ReactionDTO[]> {
    const reactions = await this.db.reaction.findMany({
      where: {
        userId,
        type,
        deletedAt: null
      },
      include: {
        post: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return reactions.map(reaction => new ReactionDTO({
      id: reaction.id,
      userId: reaction.userId,
      postId: reaction.postId,
      type: reaction.type as ReactionType,
      createdAt: reaction.createdAt
    }))
  }
} 