import { CursorPagination } from '@types'
import { CreatePostInputDTO, PostDTO } from '../dto'

export interface PostRepository {
  create: (userId: string, data: CreatePostInputDTO) => Promise<PostDTO>
  getPosts: (options: CursorPagination, whereConditions?: any) => Promise<PostDTO[]>
  getFollowingIds: (userId: string) => Promise<string[]>
  checkFollowRelationship: (followerId: string, followedId: string) => Promise<boolean>
  getUserPrivacyStatus: (userId: string) => Promise<boolean>
  delete: (postId: string) => Promise<void>
  getById: (postId: string) => Promise<PostDTO | null>
  getPostsByAuthorId: (authorId: string) => Promise<PostDTO[]>
  getCommentsByParentId: (parentId: string) => Promise<PostDTO[]>
  getCommentsByParentIdPaginated: (parentId: string, options: CursorPagination) => Promise<PostDTO[]>
  getCommentsByUserId: (userId: string) => Promise<PostDTO[]>
  updateImages: (postId: string, images: string[]) => Promise<PostDTO>
}
