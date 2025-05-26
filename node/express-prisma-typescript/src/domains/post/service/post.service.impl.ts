import { CreatePostInputDTO, ExtendedPostDTO, PostDTO } from '../dto'
import { PostRepository } from '../repository'
import { PostService } from '.'
import { validate } from 'class-validator'
import { ForbiddenException, NotFoundException } from '@utils'
import { CursorPagination } from '@types'
import { ReactionRepositoryImpl } from '@domains/reaction/repository'
import { db } from '@utils'
import { ReactionType } from '@domains/reaction/dto'
import { UserViewDTO } from '@domains/user/dto'
import { UserRepository, UserRepositoryImpl } from '@domains/user/repository'
import { generatePostPictureKey, generateUploadUrl, getPublicUrl } from '@utils/s3'

export class PostServiceImpl implements PostService {
  private readonly reactionRepository: ReactionRepositoryImpl
  private readonly userRepository: UserRepository

  constructor (private readonly repository: PostRepository) {
    this.reactionRepository = new ReactionRepositoryImpl(db)
    this.userRepository = new UserRepositoryImpl(db)
  }

  async createPost (userId: string, data: CreatePostInputDTO): Promise<PostDTO> {
    await validate(data)
    return await this.repository.create(userId, data)
  }

  async deletePost (userId: string, postId: string): Promise<void> {
    const post = await this.repository.getById(postId)
    if (!post) throw new NotFoundException('post')
    if (post.authorId !== userId) throw new ForbiddenException()
    await this.repository.delete(postId)
  }

  async getPost (userId: string, postId: string): Promise<ExtendedPostDTO> {
    // Get the post
    const post = await this.repository.getById(postId)
    if (!post) throw new NotFoundException('post')
    
    // If the requester is not the author, check for privacy
    if (post.authorId !== userId) {
      const isAuthorPrivate = await this.repository.getUserPrivacyStatus(post.authorId)
      
      if (isAuthorPrivate) {
        const isFollowing = await this.repository.checkFollowRelationship(userId, post.authorId)
        
        // If user doesn't follow private author, throw 404
        if (!isFollowing) {
          throw new NotFoundException('post')
        }
      }
    }

    // Get reaction counts and user's reaction status
    const reactionCounts = await this.reactionRepository.getCountByPostId(postId, ReactionType.LIKE)
    const retweetCounts = await this.reactionRepository.getCountByPostId(postId, ReactionType.RETWEET)
    const hasLiked = await this.reactionRepository.getByPostIdAndUserId(postId, userId, ReactionType.LIKE) !== null
    const hasRetweeted = await this.reactionRepository.getByPostIdAndUserId(postId, userId, ReactionType.RETWEET) !== null

    // Get comment count
    const comments = await this.repository.getCommentsByParentId(postId)
    const commentCount = comments.length

    // Fetch the actual author data
    const author = await this.userRepository.getById(post.authorId)
    if (!author) {
      throw new NotFoundException('user')
    }

    return new ExtendedPostDTO({
      ...post,
      author: author as any, // Type assertion to avoid compatibility issues
      qtyComments: commentCount,
      qtyLikes: reactionCounts,
      qtyRetweets: retweetCounts,
      hasLiked,
      hasRetweeted
    })
  }

  async getLatestPosts (userId: string, options: CursorPagination): Promise<ExtendedPostDTO[]> {
    // Get list of users that the current user follows
    const followingIds = await this.repository.getFollowingIds(userId)
    
    // Construct the where condition to filter posts
    const whereCondition = {
      OR: [
        { 
          author: {
            isPrivate: false
          }
        },
        {
          authorId: {
            in: followingIds
          }
        }
      ]
    }
    
    // Get posts based on constructed condition
    const posts = await this.repository.getPosts(options, whereCondition)
    
    // For each post, get the reaction counts, user's reaction status, and author info
    const extendedPosts = await Promise.all(posts.map(async (post) => {
      const reactionCounts = await this.reactionRepository.getCountByPostId(post.id, ReactionType.LIKE)
      const retweetCounts = await this.reactionRepository.getCountByPostId(post.id, ReactionType.RETWEET)
      const hasLiked = await this.reactionRepository.getByPostIdAndUserId(post.id, userId, ReactionType.LIKE) !== null
      const hasRetweeted = await this.reactionRepository.getByPostIdAndUserId(post.id, userId, ReactionType.RETWEET) !== null

      // Get comment count
      const comments = await this.repository.getCommentsByParentId(post.id)
      const commentCount = comments.length

      // Fetch the actual author data
      const author = await this.userRepository.getById(post.authorId)
      
      return new ExtendedPostDTO({
        ...post,
        author: author || { 
          id: post.authorId, 
          name: 'Usuario eliminado', 
          username: 'usuario', 
          createdAt: new Date(),
          isPrivate: false
        } as any,
        qtyComments: commentCount,
        qtyLikes: reactionCounts,
        qtyRetweets: retweetCounts,
        hasLiked,
        hasRetweeted
      })
    }))

    return extendedPosts
  }

  async getPostsByAuthor (userId: string, authorId: string): Promise<ExtendedPostDTO[]> {
    // Check if the author exists
    const isAuthorExists = await this.checkUserExists(authorId)
    if (!isAuthorExists) {
      throw new NotFoundException('user')
    }
    
    // If the author has a private profile and the requester is not the author,
    // check if the requester follows them
    if (authorId !== userId) {
      const isAuthorPrivate = await this.repository.getUserPrivacyStatus(authorId)
      
      if (isAuthorPrivate) {
        const isFollowing = await this.repository.checkFollowRelationship(userId, authorId)
        
        // If user doesn't follow private author, throw 404
        if (!isFollowing) {
          throw new NotFoundException('user')
        }
      }
    }
    
    // User is either the author, follows the private author, or the author has a public profile
    const posts = await this.repository.getPostsByAuthorId(authorId)
    
    // Fetch the author data once since all posts have the same author
    const author = await this.userRepository.getById(authorId)
    if (!author) {
      throw new NotFoundException('user')
    }

    // For each post, get the reaction counts and user's reaction status
    const extendedPosts = await Promise.all(posts.map(async (post) => {
      const reactionCounts = await this.reactionRepository.getCountByPostId(post.id, ReactionType.LIKE)
      const retweetCounts = await this.reactionRepository.getCountByPostId(post.id, ReactionType.RETWEET)
      const hasLiked = await this.reactionRepository.getByPostIdAndUserId(post.id, userId, ReactionType.LIKE) !== null
      const hasRetweeted = await this.reactionRepository.getByPostIdAndUserId(post.id, userId, ReactionType.RETWEET) !== null

      // Get comment count
      const comments = await this.repository.getCommentsByParentId(post.id)
      const commentCount = comments.length

      return new ExtendedPostDTO({
        ...post,
        author: author as any,
        qtyComments: commentCount,
        qtyLikes: reactionCounts,
        qtyRetweets: retweetCounts,
        hasLiked,
        hasRetweeted
      })
    }))

    return extendedPosts
  }
  
  async createComment(userId: string, postId: string, data: CreatePostInputDTO): Promise<PostDTO> {
    // Check if the post exists
    const post = await this.repository.getById(postId)
    if (!post) throw new NotFoundException('post')
    
    // Check if the user can see the post (privacy check)
    if (post.authorId !== userId) {
      const isAuthorPrivate = await this.repository.getUserPrivacyStatus(post.authorId)
      
      if (isAuthorPrivate) {
        const isFollowing = await this.repository.checkFollowRelationship(userId, post.authorId)
        
        // If user doesn't follow private author, throw 404
        if (!isFollowing) {
          throw new NotFoundException('post')
        }
      }
    }

    // Create the comment with parentId set to the post ID
    const commentData: CreatePostInputDTO = {
      content: data.content,
      images: data.images,
      parentId: postId
    }

    await validate(commentData)
    return await this.repository.create(userId, commentData)
  }

  async getCommentsByPostId(userId: string, postId: string): Promise<ExtendedPostDTO[]> {
    // Check if the post exists
    const post = await this.repository.getById(postId)
    if (!post) throw new NotFoundException('post')
    
    // Check if the user can see the post (privacy check)
    if (post.authorId !== userId) {
      const isAuthorPrivate = await this.repository.getUserPrivacyStatus(post.authorId)
      
      if (isAuthorPrivate) {
        const isFollowing = await this.repository.checkFollowRelationship(userId, post.authorId)
        
        // If user doesn't follow private author, throw 404
        if (!isFollowing) {
          throw new NotFoundException('post')
        }
      }
    }

    // Get all comments for this post
    const comments = await this.repository.getCommentsByParentId(postId)

    // Transform comments into ExtendedPostDTOs
    const extendedComments = await Promise.all(comments.map(async (comment) => {
      const reactionCounts = await this.reactionRepository.getCountByPostId(comment.id, ReactionType.LIKE)
      const retweetCounts = await this.reactionRepository.getCountByPostId(comment.id, ReactionType.RETWEET)
      const hasLiked = await this.reactionRepository.getByPostIdAndUserId(comment.id, userId, ReactionType.LIKE) !== null
      const hasRetweeted = await this.reactionRepository.getByPostIdAndUserId(comment.id, userId, ReactionType.RETWEET) !== null

      // Get comment count for this comment (for nested comments)
      const nestedComments = await this.repository.getCommentsByParentId(comment.id)
      const commentCount = nestedComments.length

      // Fetch the comment author
      const author = await this.userRepository.getById(comment.authorId)
      if (!author) {
        throw new NotFoundException('user')
      }

      return new ExtendedPostDTO({
        ...comment,
        author: author as any,
        qtyComments: commentCount,
        qtyLikes: reactionCounts,
        qtyRetweets: retweetCounts,
        hasLiked,
        hasRetweeted
      })
    }))

    return extendedComments
  }

  async getCommentsByPostIdPaginated(userId: string, postId: string, options: CursorPagination): Promise<ExtendedPostDTO[]> {
    // Check if the post exists
    const post = await this.repository.getById(postId)
    if (!post) throw new NotFoundException('post')
    
    // Check if the user can see the post (privacy check)
    if (post.authorId !== userId) {
      const isAuthorPrivate = await this.repository.getUserPrivacyStatus(post.authorId)
      
      if (isAuthorPrivate) {
        const isFollowing = await this.repository.checkFollowRelationship(userId, post.authorId)
        
        // If user doesn't follow private author, throw 404
        if (!isFollowing) {
          throw new NotFoundException('post')
        }
      }
    }

    // Get all comments for this post with pagination
    const comments = await this.repository.getCommentsByParentIdPaginated(postId, options)

    // Transform comments into ExtendedPostDTOs with reaction counts
    const extendedComments = await Promise.all(comments.map(async (comment) => {
      const reactionCounts = await this.reactionRepository.getCountByPostId(comment.id, ReactionType.LIKE)
      const retweetCounts = await this.reactionRepository.getCountByPostId(comment.id, ReactionType.RETWEET)
      const hasLiked = await this.reactionRepository.getByPostIdAndUserId(comment.id, userId, ReactionType.LIKE) !== null
      const hasRetweeted = await this.reactionRepository.getByPostIdAndUserId(comment.id, userId, ReactionType.RETWEET) !== null

      // Get comment count for this comment (for nested comments)
      const nestedComments = await this.repository.getCommentsByParentId(comment.id)
      const commentCount = nestedComments.length

      // Fetch the comment author
      const author = await this.userRepository.getById(comment.authorId)
      if (!author) {
        throw new NotFoundException('user')
      }

      return new ExtendedPostDTO({
        ...comment,
        author: author as any,
        qtyComments: commentCount,
        qtyLikes: reactionCounts,
        qtyRetweets: retweetCounts,
        hasLiked,
        hasRetweeted
      })
    }))

    // Sort comments by total reactions (likes + retweets) in descending order
    extendedComments.sort((a, b) => {
      const totalReactionsA = (a.qtyLikes || 0) + (a.qtyRetweets || 0);
      const totalReactionsB = (b.qtyLikes || 0) + (b.qtyRetweets || 0);
      return totalReactionsB - totalReactionsA;
    });

    return extendedComments;
  }

  async getPostsWithComments(userId: string, postId: string): Promise<ExtendedPostDTO> {
    // Get the post with all its details
    const post = await this.getPost(userId, postId)
    
    // Get all comments for this post
    const comments = await this.getCommentsByPostId(userId, postId)
    
    // Add the comments to the post
    post.comments = comments
    
    return post
  }
  
  // Helper method to check if a user exists
  private async checkUserExists(userId: string): Promise<boolean> {
    const user = await this.userRepository.getById(userId)
    return user !== null
  }

  async getCommentsByUserId(userId: string, targetUserId: string): Promise<ExtendedPostDTO[]> {
    // Check if the target user exists
    const isTargetUserExists = await this.checkUserExists(targetUserId)
    if (!isTargetUserExists) {
      throw new NotFoundException('user')
    }
    
    // If the target user has a private profile and the requester is not the target user,
    // check if the requester follows them
    if (targetUserId !== userId) {
      const isTargetUserPrivate = await this.repository.getUserPrivacyStatus(targetUserId)
      
      if (isTargetUserPrivate) {
        const isFollowing = await this.repository.checkFollowRelationship(userId, targetUserId)
        
        // If user doesn't follow private target user, throw 404
        if (!isFollowing) {
          throw new NotFoundException('user')
        }
      }
    }
    
    // User is either the target user, follows the private target user, or the target user has a public profile
    const comments = await this.repository.getCommentsByUserId(targetUserId)
    
    // Fetch the target user data once since all comments have the same author
    const author = await this.userRepository.getById(targetUserId)
    if (!author) {
      throw new NotFoundException('user')
    }

    // For each comment, get the reaction counts and user's reaction status
    const extendedComments = await Promise.all(comments.map(async (comment) => {
      const reactionCounts = await this.reactionRepository.getCountByPostId(comment.id, ReactionType.LIKE)
      const retweetCounts = await this.reactionRepository.getCountByPostId(comment.id, ReactionType.RETWEET)
      const hasLiked = await this.reactionRepository.getByPostIdAndUserId(comment.id, userId, ReactionType.LIKE) !== null
      const hasRetweeted = await this.reactionRepository.getByPostIdAndUserId(comment.id, userId, ReactionType.RETWEET) !== null

      // Get comment count (comments on this comment)
      const replies = await this.repository.getCommentsByParentId(comment.id)
      const commentCount = replies.length

      return new ExtendedPostDTO({
        ...comment,
        author: author as any,
        qtyComments: commentCount,
        qtyLikes: reactionCounts,
        qtyRetweets: retweetCounts,
        hasLiked,
        hasRetweeted
      })
    }))

    return extendedComments
  }

  async generatePostImageUploadUrl(userId: string, postId: string, fileExt: string, index: number): Promise<{ uploadUrl: string, key: string }> {
    // Check if the post exists and belongs to the user
    const post = await this.repository.getById(postId)
    if (!post) throw new NotFoundException('post')
    if (post.authorId !== userId) throw new ForbiddenException()
    
    // Generate a unique key for the image
    const key = generatePostPictureKey(postId, index, fileExt)
    
    // Get the content type based on file extension
    const contentType = this.getContentTypeFromFileExt(fileExt)
    
    // Generate the pre-signed URL for upload
    const uploadUrl = await generateUploadUrl(key, contentType)
    
    return { uploadUrl, key }
  }

  async updatePostImages(userId: string, postId: string, images: string[]): Promise<PostDTO> {
    // Check if the post exists and belongs to the user
    const post = await this.repository.getById(postId)
    if (!post) throw new NotFoundException('post')
    if (post.authorId !== userId) throw new ForbiddenException()
    
    // Update the post images
    return await this.repository.updateImages(postId, images)
  }

  private getContentTypeFromFileExt(fileExt: string): string {
    switch (fileExt.toLowerCase()) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg'
      case '.png':
        return 'image/png'
      case '.gif':
        return 'image/gif'
      case '.webp':
        return 'image/webp'
      default:
        return 'application/octet-stream'
    }
  }
}
