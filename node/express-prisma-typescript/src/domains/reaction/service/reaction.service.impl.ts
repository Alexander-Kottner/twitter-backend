import { ReactionDTO, ReactionType } from '../dto'
import { ReactionRepository } from '../repository'
import { ReactionService } from './reaction.service'

export class ReactionServiceImpl implements ReactionService {
  private repository: ReactionRepository

  constructor (repository: ReactionRepository) {
    this.repository = repository
  }

  async createReaction (userId: string, postId: string, type: ReactionType): Promise<ReactionDTO> {
    // Check if reaction already exists
    const existingReaction = await this.repository.getByPostIdAndUserId(postId, userId, type)
    if (existingReaction) {
      return existingReaction
    }

    // Create new reaction
    return this.repository.create(userId, postId, type)
  }

  async deleteReaction (userId: string, postId: string, type: ReactionType): Promise<void> {
    await this.repository.delete(userId, postId, type)
  }

  async getReactionCountsForPost (postId: string): Promise<{ likes: number, retweets: number }> {
    const [likes, retweets] = await Promise.all([
      this.repository.getCountByPostId(postId, ReactionType.LIKE),
      this.repository.getCountByPostId(postId, ReactionType.RETWEET)
    ])

    return { likes, retweets }
  }

  async hasUserReacted (userId: string, postId: string, type: ReactionType): Promise<boolean> {
    const reaction = await this.repository.getByPostIdAndUserId(postId, userId, type)
    return reaction !== null
  }

  async getUserReactions (userId: string, type: ReactionType): Promise<ReactionDTO[]> {
    return this.repository.getByUserId(userId, type)
  }
} 