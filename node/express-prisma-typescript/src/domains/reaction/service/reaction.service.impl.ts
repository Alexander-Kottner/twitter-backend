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
  
  async syncAllReactionCounts(): Promise<void> {
    // Get all post IDs from the repository instead of directly accessing the database
    const postIds = await this.repository.getAllPostIds()
    
    console.log(`Starting to sync reaction counts for ${postIds.length} posts`)
    
    // Process posts in batches to avoid memory issues
    const batchSize = 100
    for (let i = 0; i < postIds.length; i += batchSize) {
      const batch = postIds.slice(i, i + batchSize)
      
      // Process each post in the batch concurrently
      await Promise.all(
        batch.map(async (postId) => {
          await this.repository.syncReactionCounts(postId)
        })
      )
      
      console.log(`Processed reaction counts for posts ${i + 1} to ${Math.min(i + batchSize, postIds.length)}`)
    }
    
    console.log('Reaction count sync completed')
  }
}