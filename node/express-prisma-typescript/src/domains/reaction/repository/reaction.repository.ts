import { CreateReactionDTO, ReactionDTO, ReactionType } from '../dto'

export interface ReactionRepository {
  create: (userId: string, postId: string, type: ReactionType) => Promise<ReactionDTO>
  delete: (userId: string, postId: string, type: ReactionType) => Promise<void>
  getByPostIdAndUserId: (postId: string, userId: string, type: ReactionType) => Promise<ReactionDTO | null>
  getCountByPostId: (postId: string, type: ReactionType) => Promise<number>
  getByUserId: (userId: string, type: ReactionType) => Promise<ReactionDTO[]>
} 