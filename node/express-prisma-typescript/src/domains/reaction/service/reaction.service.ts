import { ReactionDTO, ReactionType } from '../dto'

export interface ReactionService {
  createReaction: (userId: string, postId: string, type: ReactionType) => Promise<ReactionDTO>
  deleteReaction: (userId: string, postId: string, type: ReactionType) => Promise<void>
  getReactionCountsForPost: (postId: string) => Promise<{ likes: number, retweets: number }>
  hasUserReacted: (userId: string, postId: string, type: ReactionType) => Promise<boolean>
  getUserReactions: (userId: string, type: ReactionType) => Promise<ReactionDTO[]>
} 