import { PostServiceImpl } from './post.service.impl'
import { PostRepository } from '../repository'
import { ReactionRepositoryImpl } from '@domains/reaction/repository'
import { UserRepository } from '@domains/user/repository'
import { 
  CreatePostInputDTO, 
  CreatePostImageDTO, 
  PostDTO, 
  ExtendedPostDTO, 
  PostImageDTO 
} from '../dto'
import { ReactionType } from '@domains/reaction/dto'
import { ExtendedUserDTO } from '@domains/user/dto'
import { CursorPagination } from '@types'
import { ForbiddenException, NotFoundException } from '@utils'
import { validate } from 'class-validator'
import { 
  generatePostPictureKey, 
  generateUploadUrl, 
  getPostImageUrl 
} from '@utils/s3'
import { describe, it, beforeEach, expect, jest} from '@jest/globals'

// Mock dependencies
jest.mock('class-validator', () => ({
  validate: jest.fn(),
  IsString: () => () => {},
  IsNotEmpty: () => () => {},
  IsOptional: () => () => {},
  IsUUID: () => () => {},
  MaxLength: () => () => {},
  IsInt: () => () => {},
  Min: () => () => {},
  Max: () => () => {},
  ValidateNested: () => () => {},
  ArrayMaxSize: () => () => {},
  IsBoolean: () => () => {}
}))

jest.mock('@utils/s3', () => ({
  generatePostPictureKey: jest.fn(),
  generateUploadUrl: jest.fn(),
  getPostImageUrl: jest.fn(),
  hasAccessToPostImage: jest.fn()
}))

jest.mock('@utils/errors', () => ({
  ForbiddenException: jest.fn().mockImplementation((...args: unknown[]) => {
    const message = args[0] as string | undefined
    const error = new Error(message || 'Forbidden')
    error.name = 'ForbiddenException'
    return error
  }),
  NotFoundException: jest.fn().mockImplementation((...args: unknown[]) => {
    const message = args[0] as string | undefined
    const error = new Error(message || 'Not Found')
    error.name = 'NotFoundException'
    return error
  })
}))

describe('PostServiceImpl', () => {
  let postService: PostServiceImpl
  let mockPostRepository: jest.Mocked<PostRepository>
  let mockReactionRepository: jest.Mocked<ReactionRepositoryImpl>
  let mockUserRepository: jest.Mocked<UserRepository>

  // Test data factories
  const createMockPost = (overrides: Partial<PostDTO> = {}): PostDTO => ({
    id: 'post-1',
    authorId: 'user-1',
    content: 'Test post content',
    createdAt: new Date(),
    parentId: undefined,
    likeCount: 0,
    retweetCount: 0,
    images: [],
    ...overrides
  })

  const createMockExtendedPost = (overrides: Partial<ExtendedPostDTO> = {}): ExtendedPostDTO => {
    const basePost = createMockPost(overrides)
    return new ExtendedPostDTO({
      ...basePost,
      author: createMockUser(),
      qtyComments: 0,
      qtyLikes: 0,
      qtyRetweets: 0,
      hasLiked: false,
      hasRetweeted: false,
      ...overrides
    } as ExtendedPostDTO)
  }

  const createMockUser = (overrides: Partial<ExtendedUserDTO> = {}): ExtendedUserDTO => ({
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedpassword',
    createdAt: new Date(),
    isPrivate: false,
    profilePicture: null,
    ...overrides
  })

  const createMockPostImage = (overrides: Partial<PostImageDTO> = {}): PostImageDTO => ({
    id: 'image-1',
    postId: 'post-1',
    s3Key: 'posts/post-1/image-0.jpg',
    index: 0,
    createdAt: new Date(),
    url: null,
    ...overrides
  })

  beforeEach(() => {
    // Create mocked repositories
    mockPostRepository = {
      create: jest.fn(),
      delete: jest.fn(),
      getById: jest.fn(),
      getPosts: jest.fn(),
      getPostsByAuthorId: jest.fn(),
      getFollowingIds: jest.fn(),
      checkFollowRelationship: jest.fn(),
      getUserPrivacyStatus: jest.fn(),
      getCommentsByParentId: jest.fn(),
      getCommentsByParentIdPaginated: jest.fn(),
      getCommentsByUserId: jest.fn(),
      createPostImage: jest.fn(),
      updatePostImage: jest.fn(),
      deletePostImage: jest.fn(),
      getPostImagesByPostId: jest.fn()
    } as any

    mockReactionRepository = {
      getByPostIdAndUserId: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      getCountByPostId: jest.fn(),
      getByUserId: jest.fn(),
      syncReactionCounts: jest.fn(),
      getAllPostIds: jest.fn()
    } as any

    mockUserRepository = {
      getById: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      getRecommendedUsersPaginated: jest.fn(),
      getByEmailOrUsername: jest.fn(),
      updatePrivacy: jest.fn(),
      updateProfilePicture: jest.fn(),
      getUsersByUsername: jest.fn()
    } as any

    // Reset mocks
    jest.clearAllMocks()
    ;(validate as jest.MockedFunction<typeof validate>).mockResolvedValue([])
    ;(generatePostPictureKey as jest.MockedFunction<typeof generatePostPictureKey>).mockReturnValue('posts/post-1/image-0.jpg')
    ;(generateUploadUrl as jest.MockedFunction<typeof generateUploadUrl>).mockResolvedValue('https://s3.example.com/upload-url')
    ;(getPostImageUrl as jest.MockedFunction<typeof getPostImageUrl>).mockResolvedValue('https://s3.example.com/image-url')

    // Create service instance
    postService = new PostServiceImpl(mockPostRepository)
    // Inject mocked dependencies via private properties
    ;(postService as any).reactionRepository = mockReactionRepository
    ;(postService as any).userRepository = mockUserRepository
  })

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      // Arrange
      const userId = 'user-1'
      const createPostData: CreatePostInputDTO = {
        content: 'Test post content'
      }
      const expectedPost = createMockPost()

      mockPostRepository.create.mockResolvedValue(expectedPost)

      // Act
      const result = await postService.createPost(userId, createPostData)

      // Assert
      expect(validate).toHaveBeenCalledWith(createPostData)
      expect(mockPostRepository.create).toHaveBeenCalledWith(userId, createPostData)
      expect(result).toEqual(expectedPost)
    })

    it('should handle validation errors', async () => {
      // Arrange
      const userId = 'user-1'
      const createPostData: CreatePostInputDTO = {
        content: ''
      }
      const validationErrors = [{ property: 'content', constraints: { isNotEmpty: 'content should not be empty' } }]
      ;(validate as jest.MockedFunction<typeof validate>).mockRejectedValue(validationErrors)

      // Act & Assert
      await expect(postService.createPost(userId, createPostData)).rejects.toEqual(validationErrors)
      expect(mockPostRepository.create).not.toHaveBeenCalled()
    })
  })

  describe('deletePost', () => {
    it('should delete post successfully when user is the author', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockPost = createMockPost({ id: postId, authorId: userId })

      mockPostRepository.getById.mockResolvedValue(mockPost)

      // Act
      await postService.deletePost(userId, postId)

      // Assert
      expect(mockPostRepository.getById).toHaveBeenCalledWith(postId)
      expect(mockPostRepository.delete).toHaveBeenCalledWith(postId)
    })

    it('should throw NotFoundException when post does not exist', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'non-existent-post'

      mockPostRepository.getById.mockResolvedValue(null)

      // Act & Assert
      await expect(postService.deletePost(userId, postId)).rejects.toThrow('post')
      expect(mockPostRepository.delete).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenException when user is not the author', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockPost = createMockPost({ id: postId, authorId: 'other-user' })

      mockPostRepository.getById.mockResolvedValue(mockPost)

      // Act & Assert
      await expect(postService.deletePost(userId, postId)).rejects.toThrow('Forbidden')
      expect(mockPostRepository.delete).not.toHaveBeenCalled()
    })
  })

  describe('getPost', () => {
    it('should return extended post when user is the author', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockPost = createMockPost({ id: postId, authorId: userId, likeCount: 5, retweetCount: 3 })
      const mockAuthor = createMockUser({ id: userId })
      const mockComments = [createMockPost(), createMockPost()]

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockUserRepository.getById.mockResolvedValue(mockAuthor)
      mockPostRepository.getCommentsByParentId.mockResolvedValue(mockComments)
      mockReactionRepository.getByPostIdAndUserId
        .mockResolvedValueOnce({ id: 'reaction-1' } as any) // hasLiked = true
        .mockResolvedValueOnce(null) // hasRetweeted = false

      // Act
      const result = await postService.getPost(userId, postId)

      // Assert
      expect(result).toBeInstanceOf(ExtendedPostDTO)
      expect(result.id).toBe(postId)
      expect(result.author).toEqual(mockAuthor)
      expect(result.qtyComments).toBe(2)
      expect(result.qtyLikes).toBe(5)
      expect(result.qtyRetweets).toBe(3)
      expect(result.hasLiked).toBe(true)
      expect(result.hasRetweeted).toBe(false)
    })

    it('should return post when user follows private author', async () => {
      // Arrange
      const userId = 'user-1'
      const authorId = 'user-2'
      const postId = 'post-1'
      const mockPost = createMockPost({ id: postId, authorId })
      const mockAuthor = createMockUser({ id: authorId, isPrivate: true })

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.getUserPrivacyStatus.mockResolvedValue(true)
      mockPostRepository.checkFollowRelationship.mockResolvedValue(true)
      mockUserRepository.getById.mockResolvedValue(mockAuthor)
      mockPostRepository.getCommentsByParentId.mockResolvedValue([])
      mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null)

      // Act
      const result = await postService.getPost(userId, postId)

      // Assert
      expect(result).toBeInstanceOf(ExtendedPostDTO)
      expect(mockPostRepository.getUserPrivacyStatus).toHaveBeenCalledWith(authorId)
      expect(mockPostRepository.checkFollowRelationship).toHaveBeenCalledWith(userId, authorId)
    })

    it('should throw NotFoundException when user does not follow private author', async () => {
      // Arrange
      const userId = 'user-1'
      const authorId = 'user-2'
      const postId = 'post-1'
      const mockPost = createMockPost({ id: postId, authorId })

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.getUserPrivacyStatus.mockResolvedValue(true)
      mockPostRepository.checkFollowRelationship.mockResolvedValue(false)

      // Act & Assert
      await expect(postService.getPost(userId, postId)).rejects.toThrow('post')
    })

    it('should throw NotFoundException when post does not exist', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'non-existent-post'

      mockPostRepository.getById.mockResolvedValue(null)

      // Act & Assert
      await expect(postService.getPost(userId, postId)).rejects.toThrow('post')
    })

    it('should handle post images with presigned URLs', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockImage = createMockPostImage()
      const mockPost = createMockPost({ 
        id: postId, 
        authorId: userId, 
        images: [mockImage] 
      })
      const mockAuthor = createMockUser({ id: userId })

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockUserRepository.getById.mockResolvedValue(mockAuthor)
      mockPostRepository.getCommentsByParentId.mockResolvedValue([])
      mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null)
      ;(getPostImageUrl as jest.MockedFunction<typeof getPostImageUrl>).mockResolvedValue('https://s3.example.com/image-url')

      // Act
      const result = await postService.getPost(userId, postId)

      // Assert
      expect(result.images).toHaveLength(1)
      expect(result.images[0].url).toBe('https://s3.example.com/image-url')
      expect(getPostImageUrl).toHaveBeenCalledWith(
        mockImage.s3Key,
        userId,
        userId,
        false,
        false
      )
    })
  })

  describe('getLatestPosts', () => {
    it('should return latest posts with author information', async () => {
      // Arrange
      const userId = 'user-1'
      const options: CursorPagination = { limit: 10 }
      const followingIds = ['user-2', 'user-3']
      const mockPosts = [
        createMockPost({ id: 'post-1', authorId: 'user-2' }),
        createMockPost({ id: 'post-2', authorId: 'user-3' })
      ]
      const mockAuthor = createMockUser()

      mockPostRepository.getFollowingIds.mockResolvedValue(followingIds)
      mockPostRepository.getPosts.mockResolvedValue(mockPosts)
      mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockPostRepository.getCommentsByParentId.mockResolvedValue([])
      mockUserRepository.getById.mockResolvedValue(mockAuthor)

      // Act
      const result = await postService.getLatestPosts(userId, options)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0]).toBeInstanceOf(ExtendedPostDTO)
      expect(mockPostRepository.getFollowingIds).toHaveBeenCalledWith(userId)
      expect(mockPostRepository.getPosts).toHaveBeenCalledWith(options, {
        OR: [
          { author: { isPrivate: false } },
          { authorId: { in: followingIds } }
        ]
      })
    })

    it('should handle deleted author gracefully', async () => {
      // Arrange
      const userId = 'user-1'
      const options: CursorPagination = { limit: 10 }
      const mockPosts = [createMockPost({ id: 'post-1', authorId: 'deleted-user' })]

      mockPostRepository.getFollowingIds.mockResolvedValue([])
      mockPostRepository.getPosts.mockResolvedValue(mockPosts)
      mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockPostRepository.getCommentsByParentId.mockResolvedValue([])
      mockUserRepository.getById.mockResolvedValue(null) // Deleted user

      // Act
      const result = await postService.getLatestPosts(userId, options)

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].author.name).toBe('Usuario eliminado')
      expect(result[0].author.username).toBe('usuario')
    })
  })

  describe('getPostsByAuthor', () => {
    it('should return posts by author when author exists and is public', async () => {
      // Arrange
      const userId = 'user-1'
      const authorId = 'user-2'
      const mockPosts = [createMockPost({ authorId })]
      const mockAuthor = createMockUser({ id: authorId, isPrivate: false })

      mockUserRepository.getById.mockResolvedValue(mockAuthor)
      mockPostRepository.getUserPrivacyStatus.mockResolvedValue(false)
      mockPostRepository.getPostsByAuthorId.mockResolvedValue(mockPosts)
      mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockPostRepository.getCommentsByParentId.mockResolvedValue([])

      // Act
      const result = await postService.getPostsByAuthor(userId, authorId)

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0]).toBeInstanceOf(ExtendedPostDTO)
      expect(result[0].author).toEqual(mockAuthor)
    })

    it('should throw NotFoundException when author does not exist', async () => {
      // Arrange
      const userId = 'user-1'
      const authorId = 'non-existent-user'

      mockUserRepository.getById.mockResolvedValue(null)

      // Act & Assert
      await expect(postService.getPostsByAuthor(userId, authorId)).rejects.toThrow('user')
    })

    it('should throw NotFoundException when author is private and user does not follow', async () => {
      // Arrange
      const userId = 'user-1'
      const authorId = 'user-2'

      mockUserRepository.getById.mockResolvedValue(createMockUser({ id: authorId }))
      mockPostRepository.getUserPrivacyStatus.mockResolvedValue(true)
      mockPostRepository.checkFollowRelationship.mockResolvedValue(false)

      // Act & Assert
      await expect(postService.getPostsByAuthor(userId, authorId)).rejects.toThrow('user')
    })
  })

  describe('createComment', () => {
    it('should create comment successfully', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const commentData: CreatePostInputDTO = {
        content: 'This is a comment'
      }
      const mockPost = createMockPost({ id: postId, authorId: 'user-2' })
      const expectedComment = createMockPost({ 
        id: 'comment-1', 
        parentId: postId,
        content: commentData.content 
      })

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.getUserPrivacyStatus.mockResolvedValue(false)
      mockPostRepository.create.mockResolvedValue(expectedComment)

      // Act
      const result = await postService.createComment(userId, postId, commentData)

      // Assert
      expect(result).toEqual(expectedComment)
      expect(mockPostRepository.create).toHaveBeenCalledWith(userId, {
        content: commentData.content,
        parentId: postId
      })
    })

    it('should throw NotFoundException when post does not exist', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'non-existent-post'
      const commentData: CreatePostInputDTO = {
        content: 'This is a comment'
      }

      mockPostRepository.getById.mockResolvedValue(null)

      // Act & Assert
      await expect(postService.createComment(userId, postId, commentData)).rejects.toThrow('post')
    })

    it('should throw NotFoundException when commenting on private user post without following', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const commentData: CreatePostInputDTO = {
        content: 'This is a comment'
      }
      const mockPost = createMockPost({ id: postId, authorId: 'user-2' })

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.getUserPrivacyStatus.mockResolvedValue(true)
      mockPostRepository.checkFollowRelationship.mockResolvedValue(false)

      // Act & Assert
      await expect(postService.createComment(userId, postId, commentData)).rejects.toThrow('post')
    })
  })

  describe('getCommentsByPostId', () => {
    it('should return comments for a post', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockPost = createMockPost({ id: postId, authorId: userId })
      const mockComments = [
        createMockPost({ id: 'comment-1', parentId: postId }),
        createMockPost({ id: 'comment-2', parentId: postId })
      ]
      const mockAuthor = createMockUser()

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.getCommentsByParentId.mockResolvedValue(mockComments)
      mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockUserRepository.getById.mockResolvedValue(mockAuthor)

      // Act
      const result = await postService.getCommentsByPostId(userId, postId)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0]).toBeInstanceOf(ExtendedPostDTO)
      expect(result[0].id).toBe('comment-1')
    })
  })

  describe('getCommentsByPostIdPaginated', () => {
    it('should return paginated comments sorted by reactions', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const options: CursorPagination = { limit: 5 }
      const mockPost = createMockPost({ id: postId, authorId: userId })
      const mockComments = [
        createMockPost({ id: 'comment-1', likeCount: 5, retweetCount: 2 }),
        createMockPost({ id: 'comment-2', likeCount: 1, retweetCount: 1 })
      ]
      const mockAuthor = createMockUser()

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.getCommentsByParentIdPaginated.mockResolvedValue(mockComments)
      mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockPostRepository.getCommentsByParentId.mockResolvedValue([])
      mockUserRepository.getById.mockResolvedValue(mockAuthor)

      // Act
      const result = await postService.getCommentsByPostIdPaginated(userId, postId, options)

      // Assert
      expect(result).toHaveLength(2)
      // Should be sorted by total reactions (descending)
      expect(result[0].qtyLikes + result[0].qtyRetweets).toBeGreaterThanOrEqual(
        result[1].qtyLikes + result[1].qtyRetweets
      )
    })
  })

  describe('getPostsWithComments', () => {
    it('should return post with its comments', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockPost = createMockExtendedPost({ id: postId })
      const mockComments = [createMockExtendedPost({ id: 'comment-1' })]

      // Mock the methods that getPostsWithComments calls internally
      jest.spyOn(postService, 'getPost').mockResolvedValue(mockPost)
      jest.spyOn(postService, 'getCommentsByPostId').mockResolvedValue(mockComments)

      // Act
      const result = await postService.getPostsWithComments(userId, postId)

      // Assert
      expect(result.id).toBe(postId)
      expect(result.comments).toEqual(mockComments)
    })
  })

  describe('getCommentsByUserId', () => {
    it('should return comments by user when user exists and is public', async () => {
      // Arrange
      const userId = 'user-1'
      const targetUserId = 'user-2'
      const mockComments = [createMockPost({ authorId: targetUserId })]
      const mockAuthor = createMockUser({ id: targetUserId })

      mockUserRepository.getById.mockResolvedValue(mockAuthor)
      mockPostRepository.getUserPrivacyStatus.mockResolvedValue(false)
      mockPostRepository.getCommentsByUserId.mockResolvedValue(mockComments)
      mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockPostRepository.getCommentsByParentId.mockResolvedValue([])

      // Act
      const result = await postService.getCommentsByUserId(userId, targetUserId)

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0]).toBeInstanceOf(ExtendedPostDTO)
    })

    it('should throw NotFoundException when target user does not exist', async () => {
      // Arrange
      const userId = 'user-1'
      const targetUserId = 'non-existent-user'

      mockUserRepository.getById.mockResolvedValue(null)

      // Act & Assert
      await expect(postService.getCommentsByUserId(userId, targetUserId)).rejects.toThrow('user')
    })
  })

  describe('generatePostImageUploadUrl', () => {
    it('should generate upload URL for post image', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const fileExt = '.jpg'
      const index = 0
      const mockPost = createMockPost({ id: postId, authorId: userId })
      const expectedKey = 'posts/post-1/image-0.jpg'
      const expectedUploadUrl = 'https://s3.example.com/upload-url'

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.getPostImagesByPostId.mockResolvedValue([])
      ;(generatePostPictureKey as jest.MockedFunction<typeof generatePostPictureKey>).mockReturnValue(expectedKey)
      ;(generateUploadUrl as jest.MockedFunction<typeof generateUploadUrl>).mockResolvedValue(expectedUploadUrl)

      // Act
      const result = await postService.generatePostImageUploadUrl(userId, postId, fileExt, index)

      // Assert
      expect(result).toEqual({
        uploadUrl: expectedUploadUrl,
        key: expectedKey
      })
      expect(generatePostPictureKey).toHaveBeenCalledWith(postId, index, fileExt)
    })

    it('should throw NotFoundException when post does not exist', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'non-existent-post'

      mockPostRepository.getById.mockResolvedValue(null)

      // Act & Assert
      await expect(
        postService.generatePostImageUploadUrl(userId, postId, '.jpg', 0)
      ).rejects.toThrow('post')
    })

    it('should throw ForbiddenException when user is not the post author', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockPost = createMockPost({ id: postId, authorId: 'other-user' })

      mockPostRepository.getById.mockResolvedValue(mockPost)

      // Act & Assert
      await expect(
        postService.generatePostImageUploadUrl(userId, postId, '.jpg', 0)
      ).rejects.toThrow('Forbidden')
    })

    it('should throw ForbiddenException for invalid index', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockPost = createMockPost({ id: postId, authorId: userId })

      mockPostRepository.getById.mockResolvedValue(mockPost)

      // Act & Assert
      await expect(
        postService.generatePostImageUploadUrl(userId, postId, '.jpg', -1)
      ).rejects.toThrow('Image index must be between 0 and 3')

      await expect(
        postService.generatePostImageUploadUrl(userId, postId, '.jpg', 4)
      ).rejects.toThrow('Image index must be between 0 and 3')
    })

    it('should throw ForbiddenException when maximum images exceeded', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockPost = createMockPost({ id: postId, authorId: userId })
      const existingImages = [
        createMockPostImage({ index: 0 }),
        createMockPostImage({ index: 1 }),
        createMockPostImage({ index: 2 }),
        createMockPostImage({ index: 3 })
      ]

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.getPostImagesByPostId.mockResolvedValue(existingImages)

      // Act & Assert
      await expect(
        postService.generatePostImageUploadUrl(userId, postId, '.jpg', 0) // Trying to add when all slots are taken
      ).rejects.toThrow('Maximum of 4 images per post allowed')
    })
  })

  describe('addPostImage', () => {
    it('should add new post image', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const s3Key = 'posts/post-1/image-0.jpg'
      const index = 0
      const mockPost = createMockPost({ id: postId, authorId: userId })
      const expectedImage = createMockPostImage({ s3Key, index })

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.getPostImagesByPostId.mockResolvedValue([])
      mockPostRepository.createPostImage.mockResolvedValue(expectedImage)

      // Act
      const result = await postService.addPostImage(userId, postId, s3Key, index)

      // Assert
      expect(result).toEqual(expectedImage)
      expect(mockPostRepository.createPostImage).toHaveBeenCalledWith({
        postId,
        s3Key,
        index
      })
    })

    it('should update existing image at index', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const s3Key = 'posts/post-1/image-0-new.jpg'
      const index = 0
      const mockPost = createMockPost({ id: postId, authorId: userId })
      const existingImage = createMockPostImage({ id: 'image-1', index })
      const updatedImage = createMockPostImage({ ...existingImage, s3Key })

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.getPostImagesByPostId.mockResolvedValue([existingImage])
      mockPostRepository.updatePostImage.mockResolvedValue(updatedImage)

      // Act
      const result = await postService.addPostImage(userId, postId, s3Key, index)

      // Assert
      expect(result).toEqual(updatedImage)
      expect(mockPostRepository.updatePostImage).toHaveBeenCalledWith(existingImage.id, s3Key)
    })
  })

  describe('updatePostImage', () => {
    it('should update post image successfully', async () => {
      // Arrange
      const userId = 'user-1'
      const imageId = 'image-1'
      const s3Key = 'new-s3-key.jpg'
      const mockImage = createMockPostImage({ id: imageId })
      const mockPost = createMockPost({ authorId: userId })
      const updatedImage = createMockPostImage({ ...mockImage, s3Key })

      mockPostRepository.getPostImagesByPostId.mockResolvedValue([mockImage])
      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.updatePostImage.mockResolvedValue(updatedImage)

      // Act
      const result = await postService.updatePostImage(userId, imageId, s3Key)

      // Assert
      expect(result).toEqual(updatedImage)
      expect(mockPostRepository.updatePostImage).toHaveBeenCalledWith(imageId, s3Key)
    })

    it('should throw NotFoundException when image does not exist', async () => {
      // Arrange
      const userId = 'user-1'
      const imageId = 'non-existent-image'

      mockPostRepository.getPostImagesByPostId.mockResolvedValue([])

      // Act & Assert
      await expect(
        postService.updatePostImage(userId, imageId, 'new-key.jpg')
      ).rejects.toThrow('image')
    })

    it('should throw ForbiddenException when user is not the post author', async () => {
      // Arrange
      const userId = 'user-1'
      const imageId = 'image-1'
      const mockImage = createMockPostImage({ id: imageId })
      const mockPost = createMockPost({ authorId: 'other-user' })

      mockPostRepository.getPostImagesByPostId.mockResolvedValue([mockImage])
      mockPostRepository.getById.mockResolvedValue(mockPost)

      // Act & Assert
      await expect(
        postService.updatePostImage(userId, imageId, 'new-key.jpg')
      ).rejects.toThrow('Forbidden')
    })
  })

  describe('deletePostImage', () => {
    it('should delete post image successfully', async () => {
      // Arrange
      const userId = 'user-1'
      const imageId = 'image-1'
      const mockImage = createMockPostImage({ id: imageId })
      const mockPost = createMockPost({ authorId: userId })

      mockPostRepository.getPostImagesByPostId.mockResolvedValue([mockImage])
      mockPostRepository.getById.mockResolvedValue(mockPost)

      // Act
      await postService.deletePostImage(userId, imageId)

      // Assert
      expect(mockPostRepository.deletePostImage).toHaveBeenCalledWith(imageId)
    })
  })

  describe('getPostImages', () => {
    it('should return post images with URLs for public post', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockPost = createMockPost({ id: postId, authorId: 'user-2' })
      const mockImages = [createMockPostImage()]
      const expectedUrl = 'https://s3.example.com/image-url'

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.getUserPrivacyStatus.mockResolvedValue(false)
      mockPostRepository.getPostImagesByPostId.mockResolvedValue(mockImages)
      ;(getPostImageUrl as jest.MockedFunction<typeof getPostImageUrl>).mockResolvedValue(expectedUrl)

      // Act
      const result = await postService.getPostImages(userId, postId)

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].url).toBe(expectedUrl)
    })

    it('should throw NotFoundException when user cannot access private post images', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockPost = createMockPost({ id: postId, authorId: 'user-2' })

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockPostRepository.getUserPrivacyStatus.mockResolvedValue(true)
      mockPostRepository.checkFollowRelationship.mockResolvedValue(false)

      // Act & Assert
      await expect(postService.getPostImages(userId, postId)).rejects.toThrow('post')
    })
  })

  describe('getContentTypeFromFileExt', () => {
    it('should return correct content types', () => {
      // Access private method for testing
      const getContentType = (postService as any).getContentTypeFromFileExt.bind(postService)

      expect(getContentType('.jpg')).toBe('image/jpeg')
      expect(getContentType('.jpeg')).toBe('image/jpeg')
      expect(getContentType('.png')).toBe('image/png')
      expect(getContentType('.gif')).toBe('image/gif')
      expect(getContentType('.webp')).toBe('image/webp')
      expect(getContentType('.unknown')).toBe('application/octet-stream')
    })
  })

  describe('checkUserExists', () => {
    it('should return true when user exists', async () => {
      // Arrange
      const userId = 'user-1'
      const mockUser = createMockUser({ id: userId })

      mockUserRepository.getById.mockResolvedValue(mockUser)

      // Act
      const result = await (postService as any).checkUserExists(userId)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false when user does not exist', async () => {
      // Arrange
      const userId = 'non-existent-user'

      mockUserRepository.getById.mockResolvedValue(null)

      // Act
      const result = await (postService as any).checkUserExists(userId)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const repositoryError = new Error('Database connection failed')

      mockPostRepository.getById.mockRejectedValue(repositoryError)

      // Act & Assert
      await expect(postService.getPost(userId, postId)).rejects.toThrow('Database connection failed')
    })

    it('should handle empty results appropriately', async () => {
      // Arrange
      const userId = 'user-1'
      const options: CursorPagination = { limit: 10 }

      mockPostRepository.getFollowingIds.mockResolvedValue([])
      mockPostRepository.getPosts.mockResolvedValue([])

      // Act
      const result = await postService.getLatestPosts(userId, options)

      // Assert
      expect(result).toEqual([])
    })

    it('should handle null/undefined reactions correctly', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockPost = createMockPost({ id: postId, authorId: userId })
      const mockAuthor = createMockUser({ id: userId })

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockUserRepository.getById.mockResolvedValue(mockAuthor)
      mockPostRepository.getCommentsByParentId.mockResolvedValue([])
      mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null)

      // Act
      const result = await postService.getPost(userId, postId)

      // Assert
      expect(result.hasLiked).toBe(false)
      expect(result.hasRetweeted).toBe(false)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complex privacy scenario with multiple users', async () => {
      // Arrange
      const currentUser = 'user-1'
      const privateUser = 'user-2'
      const publicUser = 'user-3'
      const options: CursorPagination = { limit: 10 }

      const posts = [
        createMockPost({ id: 'post-1', authorId: privateUser }),
        createMockPost({ id: 'post-2', authorId: publicUser })
      ]

      mockPostRepository.getFollowingIds.mockResolvedValue([privateUser])
      mockPostRepository.getPosts.mockResolvedValue(posts)
      mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null)
      mockPostRepository.getCommentsByParentId.mockResolvedValue([])
      
      // Mock different privacy statuses
      mockUserRepository.getById
        .mockResolvedValueOnce(createMockUser({ id: privateUser, isPrivate: true }))
        .mockResolvedValueOnce(createMockUser({ id: publicUser, isPrivate: false }))

      mockPostRepository.checkFollowRelationship.mockResolvedValue(true)

      // Act
      const result = await postService.getLatestPosts(currentUser, options)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].author.isPrivate).toBe(true)
      expect(result[1].author.isPrivate).toBe(false)
    })

    it('should handle post with multiple images and comments', async () => {
      // Arrange
      const userId = 'user-1'
      const postId = 'post-1'
      const mockImages = [
        createMockPostImage({ index: 0 }),
        createMockPostImage({ index: 1 })
      ]
      const mockPost = createMockPost({ 
        id: postId, 
        authorId: userId, 
        images: mockImages,
        likeCount: 10,
        retweetCount: 5
      })
      const mockComments = [
        createMockPost({ id: 'comment-1' }),
        createMockPost({ id: 'comment-2' }),
        createMockPost({ id: 'comment-3' })
      ]
      const mockAuthor = createMockUser({ id: userId })

      mockPostRepository.getById.mockResolvedValue(mockPost)
      mockUserRepository.getById.mockResolvedValue(mockAuthor)
      mockPostRepository.getCommentsByParentId.mockResolvedValue(mockComments)
      mockReactionRepository.getByPostIdAndUserId
        .mockResolvedValueOnce({ id: 'like-1' } as any) // hasLiked = true
        .mockResolvedValueOnce({ id: 'retweet-1' } as any) // hasRetweeted = true

      ;(getPostImageUrl as jest.MockedFunction<typeof getPostImageUrl>).mockResolvedValue('https://s3.example.com/image-url')

      // Act
      const result = await postService.getPost(userId, postId)

      // Assert
      expect(result.images).toHaveLength(2)
      expect(result.qtyComments).toBe(3)
      expect(result.qtyLikes).toBe(10)
      expect(result.qtyRetweets).toBe(5)
      expect(result.hasLiked).toBe(true)
      expect(result.hasRetweeted).toBe(true)
      expect(result.images.every(img => img.url === 'https://s3.example.com/image-url')).toBe(true)
    })
  })
})