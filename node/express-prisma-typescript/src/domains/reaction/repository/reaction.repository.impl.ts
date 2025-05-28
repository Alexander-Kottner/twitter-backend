import { PrismaClient } from '@prisma/client'
import { ReactionDTO, ReactionType } from '../dto'
import { ReactionRepository } from './reaction.repository'

export class ReactionRepositoryImpl implements ReactionRepository {
  private db: PrismaClient

  constructor (db: PrismaClient) {
    this.db = db
  }

  async create (userId: string, postId: string, type: ReactionType): Promise<ReactionDTO> {
    // Check if the reaction already exists to avoid duplicate increments
    const existingReaction = await this.getByPostIdAndUserId(postId, userId, type)
    
    if (existingReaction) {
      return existingReaction
    }
    
    // Start a transaction to ensure both operations succeed or fail together
    return await this.db.$transaction(async (tx) => {
      // Create the reaction
      const reaction = await tx.reaction.create({
        data: {
          userId,
          postId,
          type
        }
      })
      
      // Increment the appropriate count on the post
      if (type === ReactionType.LIKE) {
        await tx.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } }
        })
      } else if (type === ReactionType.RETWEET) {
        await tx.post.update({
          where: { id: postId },
          data: { retweetCount: { increment: 1 } }
        })
      }

      return new ReactionDTO({
        id: reaction.id,
        userId: reaction.userId,
        postId: reaction.postId,
        type: reaction.type as ReactionType,
        createdAt: reaction.createdAt
      })
    })
  }

  async delete (userId: string, postId: string, type: ReactionType): Promise<void> {
    // Check if the reaction exists before attempting to delete
    const existingReaction = await this.getByPostIdAndUserId(postId, userId, type)
    
    if (!existingReaction) {
      return // Nothing to delete
    }
    
    // Use a transaction to ensure both operations succeed or fail together
    await this.db.$transaction(async (tx) => {
      // Delete the reaction
      await tx.reaction.deleteMany({
        where: {
          userId,
          postId,
          type,
          deletedAt: null
        }
      })
      
      // Decrement the appropriate count on the post (ensuring it doesn't go below 0)
      if (type === ReactionType.LIKE) {
        await tx.post.update({
          where: { id: postId },
          data: { 
            likeCount: {
              decrement: 1
            }
          }
        })
      } else if (type === ReactionType.RETWEET) {
        await tx.post.update({
          where: { id: postId },
          data: { 
            retweetCount: {
              decrement: 1
            }
          }
        })
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
    // Instead of counting reactions, get the count directly from the post
    const post = await this.db.post.findUnique({
      where: { id: postId },
      select: { 
        likeCount: type === ReactionType.LIKE,
        retweetCount: type === ReactionType.RETWEET
      }
    })
    
    if (!post) return 0
    
    return type === ReactionType.LIKE ? post.likeCount : post.retweetCount
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

  async syncReactionCounts(postId: string): Promise<void> {
    // Count actual reactions in the database
    const [likeCount, retweetCount] = await Promise.all([
      this.db.reaction.count({
        where: {
          postId,
          type: 'LIKE',
          deletedAt: null
        }
      }),
      this.db.reaction.count({
        where: {
          postId,
          type: 'RETWEET',
          deletedAt: null
        }
      })
    ])
    
    // Update the post with accurate counts
    await this.db.post.update({
      where: { id: postId },
      data: {
        likeCount,
        retweetCount
      }
    })
  }

  async getAllPostIds(): Promise<string[]> {
    const posts = await this.db.post.findMany({
      select: { id: true },
      where: { deletedAt: null }
    })
    
    return posts.map(post => post.id)
  }
}