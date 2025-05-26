import { CreatePostInputDTO, ExtendedPostDTO, PostDTO } from '../dto'
import { CursorPagination } from '@types'

export interface PostService {
  createPost: (userId: string, body: CreatePostInputDTO) => Promise<PostDTO>
  deletePost: (userId: string, postId: string) => Promise<void>
  getPost: (userId: string, postId: string) => Promise<ExtendedPostDTO>
  getLatestPosts: (userId: string, options: { limit?: number, before?: string, after?: string }) => Promise<ExtendedPostDTO[]>
  getPostsByAuthor: (userId: string, authorId: string) => Promise<ExtendedPostDTO[]>
  createComment: (userId: string, postId: string, body: CreatePostInputDTO) => Promise<PostDTO>
  getCommentsByPostId: (userId: string, postId: string) => Promise<ExtendedPostDTO[]>
  getCommentsByPostIdPaginated: (userId: string, postId: string, options: CursorPagination) => Promise<ExtendedPostDTO[]>
  getPostsWithComments: (userId: string, postId: string) => Promise<ExtendedPostDTO>
  getCommentsByUserId: (userId: string, targetUserId: string) => Promise<ExtendedPostDTO[]>
  generatePostImageUploadUrl: (userId: string, postId: string, fileExt: string, index: number) => Promise<{ uploadUrl: string, key: string }>
  updatePostImages: (userId: string, postId: string, images: string[]) => Promise<PostDTO>
}
