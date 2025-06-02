"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const post_service_impl_1 = require("./post.service.impl");
const dto_1 = require("../dto");
const class_validator_1 = require("class-validator");
const s3_1 = require("../../../utils/s3");
const globals_1 = require("@jest/globals");
globals_1.jest.mock('class-validator', () => ({
    validate: globals_1.jest.fn(),
    IsString: () => () => { },
    IsNotEmpty: () => () => { },
    IsOptional: () => () => { },
    IsUUID: () => () => { },
    MaxLength: () => () => { },
    IsInt: () => () => { },
    Min: () => () => { },
    Max: () => () => { },
    ValidateNested: () => () => { },
    ArrayMaxSize: () => () => { }
}));
globals_1.jest.mock('@utils/s3', () => ({
    generatePostPictureKey: globals_1.jest.fn(),
    generateUploadUrl: globals_1.jest.fn(),
    getPostImageUrl: globals_1.jest.fn(),
    hasAccessToPostImage: globals_1.jest.fn()
}));
globals_1.jest.mock('@utils/errors', () => ({
    ForbiddenException: globals_1.jest.fn().mockImplementation((...args) => {
        const message = args[0];
        const error = new Error(message || 'Forbidden');
        error.name = 'ForbiddenException';
        return error;
    }),
    NotFoundException: globals_1.jest.fn().mockImplementation((...args) => {
        const message = args[0];
        const error = new Error(message || 'Not Found');
        error.name = 'NotFoundException';
        return error;
    })
}));
(0, globals_1.describe)('PostServiceImpl', () => {
    let postService;
    let mockPostRepository;
    let mockReactionRepository;
    let mockUserRepository;
    const createMockPost = (overrides = {}) => ({
        id: 'post-1',
        authorId: 'user-1',
        content: 'Test post content',
        createdAt: new Date(),
        parentId: undefined,
        likeCount: 0,
        retweetCount: 0,
        images: [],
        ...overrides
    });
    const createMockExtendedPost = (overrides = {}) => {
        const basePost = createMockPost(overrides);
        return new dto_1.ExtendedPostDTO({
            ...basePost,
            author: createMockUser(),
            qtyComments: 0,
            qtyLikes: 0,
            qtyRetweets: 0,
            hasLiked: false,
            hasRetweeted: false,
            ...overrides
        });
    };
    const createMockUser = (overrides = {}) => ({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        createdAt: new Date(),
        isPrivate: false,
        profilePicture: null,
        ...overrides
    });
    const createMockPostImage = (overrides = {}) => ({
        id: 'image-1',
        postId: 'post-1',
        s3Key: 'posts/post-1/image-0.jpg',
        index: 0,
        createdAt: new Date(),
        url: null,
        ...overrides
    });
    (0, globals_1.beforeEach)(() => {
        mockPostRepository = {
            create: globals_1.jest.fn(),
            delete: globals_1.jest.fn(),
            getById: globals_1.jest.fn(),
            getPosts: globals_1.jest.fn(),
            getPostsByAuthorId: globals_1.jest.fn(),
            getFollowingIds: globals_1.jest.fn(),
            checkFollowRelationship: globals_1.jest.fn(),
            getUserPrivacyStatus: globals_1.jest.fn(),
            getCommentsByParentId: globals_1.jest.fn(),
            getCommentsByParentIdPaginated: globals_1.jest.fn(),
            getCommentsByUserId: globals_1.jest.fn(),
            createPostImage: globals_1.jest.fn(),
            updatePostImage: globals_1.jest.fn(),
            deletePostImage: globals_1.jest.fn(),
            getPostImagesByPostId: globals_1.jest.fn()
        };
        mockReactionRepository = {
            getByPostIdAndUserId: globals_1.jest.fn(),
            create: globals_1.jest.fn(),
            delete: globals_1.jest.fn(),
            getCountByPostId: globals_1.jest.fn(),
            getByUserId: globals_1.jest.fn(),
            syncReactionCounts: globals_1.jest.fn(),
            getAllPostIds: globals_1.jest.fn()
        };
        mockUserRepository = {
            getById: globals_1.jest.fn(),
            create: globals_1.jest.fn(),
            delete: globals_1.jest.fn(),
            getRecommendedUsersPaginated: globals_1.jest.fn(),
            getByEmailOrUsername: globals_1.jest.fn(),
            updatePrivacy: globals_1.jest.fn(),
            updateProfilePicture: globals_1.jest.fn(),
            getUsersByUsername: globals_1.jest.fn()
        };
        globals_1.jest.clearAllMocks();
        class_validator_1.validate.mockResolvedValue([]);
        s3_1.generatePostPictureKey.mockReturnValue('posts/post-1/image-0.jpg');
        s3_1.generateUploadUrl.mockResolvedValue('https://s3.example.com/upload-url');
        s3_1.getPostImageUrl.mockResolvedValue('https://s3.example.com/image-url');
        postService = new post_service_impl_1.PostServiceImpl(mockPostRepository);
        postService.reactionRepository = mockReactionRepository;
        postService.userRepository = mockUserRepository;
    });
    (0, globals_1.describe)('createPost', () => {
        (0, globals_1.it)('should create a post successfully', async () => {
            const userId = 'user-1';
            const createPostData = {
                content: 'Test post content'
            };
            const expectedPost = createMockPost();
            mockPostRepository.create.mockResolvedValue(expectedPost);
            const result = await postService.createPost(userId, createPostData);
            (0, globals_1.expect)(class_validator_1.validate).toHaveBeenCalledWith(createPostData);
            (0, globals_1.expect)(mockPostRepository.create).toHaveBeenCalledWith(userId, createPostData);
            (0, globals_1.expect)(result).toEqual(expectedPost);
        });
        (0, globals_1.it)('should handle validation errors', async () => {
            const userId = 'user-1';
            const createPostData = {
                content: ''
            };
            const validationErrors = [{ property: 'content', constraints: { isNotEmpty: 'content should not be empty' } }];
            class_validator_1.validate.mockRejectedValue(validationErrors);
            await (0, globals_1.expect)(postService.createPost(userId, createPostData)).rejects.toEqual(validationErrors);
            (0, globals_1.expect)(mockPostRepository.create).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('deletePost', () => {
        (0, globals_1.it)('should delete post successfully when user is the author', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockPost = createMockPost({ id: postId, authorId: userId });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            await postService.deletePost(userId, postId);
            (0, globals_1.expect)(mockPostRepository.getById).toHaveBeenCalledWith(postId);
            (0, globals_1.expect)(mockPostRepository.delete).toHaveBeenCalledWith(postId);
        });
        (0, globals_1.it)('should throw NotFoundException when post does not exist', async () => {
            const userId = 'user-1';
            const postId = 'non-existent-post';
            mockPostRepository.getById.mockResolvedValue(null);
            await (0, globals_1.expect)(postService.deletePost(userId, postId)).rejects.toThrow('post');
            (0, globals_1.expect)(mockPostRepository.delete).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw ForbiddenException when user is not the author', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockPost = createMockPost({ id: postId, authorId: 'other-user' });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            await (0, globals_1.expect)(postService.deletePost(userId, postId)).rejects.toThrow('Forbidden');
            (0, globals_1.expect)(mockPostRepository.delete).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('getPost', () => {
        (0, globals_1.it)('should return extended post when user is the author', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockPost = createMockPost({ id: postId, authorId: userId, likeCount: 5, retweetCount: 3 });
            const mockAuthor = createMockUser({ id: userId });
            const mockComments = [createMockPost(), createMockPost()];
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockUserRepository.getById.mockResolvedValue(mockAuthor);
            mockPostRepository.getCommentsByParentId.mockResolvedValue(mockComments);
            mockReactionRepository.getByPostIdAndUserId
                .mockResolvedValueOnce({ id: 'reaction-1' })
                .mockResolvedValueOnce(null);
            const result = await postService.getPost(userId, postId);
            (0, globals_1.expect)(result).toBeInstanceOf(dto_1.ExtendedPostDTO);
            (0, globals_1.expect)(result.id).toBe(postId);
            (0, globals_1.expect)(result.author).toEqual(mockAuthor);
            (0, globals_1.expect)(result.qtyComments).toBe(2);
            (0, globals_1.expect)(result.qtyLikes).toBe(5);
            (0, globals_1.expect)(result.qtyRetweets).toBe(3);
            (0, globals_1.expect)(result.hasLiked).toBe(true);
            (0, globals_1.expect)(result.hasRetweeted).toBe(false);
        });
        (0, globals_1.it)('should return post when user follows private author', async () => {
            const userId = 'user-1';
            const authorId = 'user-2';
            const postId = 'post-1';
            const mockPost = createMockPost({ id: postId, authorId });
            const mockAuthor = createMockUser({ id: authorId, isPrivate: true });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.getUserPrivacyStatus.mockResolvedValue(true);
            mockPostRepository.checkFollowRelationship.mockResolvedValue(true);
            mockUserRepository.getById.mockResolvedValue(mockAuthor);
            mockPostRepository.getCommentsByParentId.mockResolvedValue([]);
            mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null);
            const result = await postService.getPost(userId, postId);
            (0, globals_1.expect)(result).toBeInstanceOf(dto_1.ExtendedPostDTO);
            (0, globals_1.expect)(mockPostRepository.getUserPrivacyStatus).toHaveBeenCalledWith(authorId);
            (0, globals_1.expect)(mockPostRepository.checkFollowRelationship).toHaveBeenCalledWith(userId, authorId);
        });
        (0, globals_1.it)('should throw NotFoundException when user does not follow private author', async () => {
            const userId = 'user-1';
            const authorId = 'user-2';
            const postId = 'post-1';
            const mockPost = createMockPost({ id: postId, authorId });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.getUserPrivacyStatus.mockResolvedValue(true);
            mockPostRepository.checkFollowRelationship.mockResolvedValue(false);
            await (0, globals_1.expect)(postService.getPost(userId, postId)).rejects.toThrow('post');
        });
        (0, globals_1.it)('should throw NotFoundException when post does not exist', async () => {
            const userId = 'user-1';
            const postId = 'non-existent-post';
            mockPostRepository.getById.mockResolvedValue(null);
            await (0, globals_1.expect)(postService.getPost(userId, postId)).rejects.toThrow('post');
        });
        (0, globals_1.it)('should handle post images with presigned URLs', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockImage = createMockPostImage();
            const mockPost = createMockPost({
                id: postId,
                authorId: userId,
                images: [mockImage]
            });
            const mockAuthor = createMockUser({ id: userId });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockUserRepository.getById.mockResolvedValue(mockAuthor);
            mockPostRepository.getCommentsByParentId.mockResolvedValue([]);
            mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null);
            s3_1.getPostImageUrl.mockResolvedValue('https://s3.example.com/image-url');
            const result = await postService.getPost(userId, postId);
            (0, globals_1.expect)(result.images).toHaveLength(1);
            (0, globals_1.expect)(result.images[0].url).toBe('https://s3.example.com/image-url');
            (0, globals_1.expect)(s3_1.getPostImageUrl).toHaveBeenCalledWith(mockImage.s3Key, userId, userId, false, false);
        });
    });
    (0, globals_1.describe)('getLatestPosts', () => {
        (0, globals_1.it)('should return latest posts with author information', async () => {
            const userId = 'user-1';
            const options = { limit: 10 };
            const followingIds = ['user-2', 'user-3'];
            const mockPosts = [
                createMockPost({ id: 'post-1', authorId: 'user-2' }),
                createMockPost({ id: 'post-2', authorId: 'user-3' })
            ];
            const mockAuthor = createMockUser();
            mockPostRepository.getFollowingIds.mockResolvedValue(followingIds);
            mockPostRepository.getPosts.mockResolvedValue(mockPosts);
            mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockPostRepository.getCommentsByParentId.mockResolvedValue([]);
            mockUserRepository.getById.mockResolvedValue(mockAuthor);
            const result = await postService.getLatestPosts(userId, options);
            (0, globals_1.expect)(result).toHaveLength(2);
            (0, globals_1.expect)(result[0]).toBeInstanceOf(dto_1.ExtendedPostDTO);
            (0, globals_1.expect)(mockPostRepository.getFollowingIds).toHaveBeenCalledWith(userId);
            (0, globals_1.expect)(mockPostRepository.getPosts).toHaveBeenCalledWith(options, {
                OR: [
                    { author: { isPrivate: false } },
                    { authorId: { in: followingIds } }
                ]
            });
        });
        (0, globals_1.it)('should handle deleted author gracefully', async () => {
            const userId = 'user-1';
            const options = { limit: 10 };
            const mockPosts = [createMockPost({ id: 'post-1', authorId: 'deleted-user' })];
            mockPostRepository.getFollowingIds.mockResolvedValue([]);
            mockPostRepository.getPosts.mockResolvedValue(mockPosts);
            mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockPostRepository.getCommentsByParentId.mockResolvedValue([]);
            mockUserRepository.getById.mockResolvedValue(null);
            const result = await postService.getLatestPosts(userId, options);
            (0, globals_1.expect)(result).toHaveLength(1);
            (0, globals_1.expect)(result[0].author.name).toBe('Usuario eliminado');
            (0, globals_1.expect)(result[0].author.username).toBe('usuario');
        });
    });
    (0, globals_1.describe)('getPostsByAuthor', () => {
        (0, globals_1.it)('should return posts by author when author exists and is public', async () => {
            const userId = 'user-1';
            const authorId = 'user-2';
            const mockPosts = [createMockPost({ authorId })];
            const mockAuthor = createMockUser({ id: authorId, isPrivate: false });
            mockUserRepository.getById.mockResolvedValue(mockAuthor);
            mockPostRepository.getUserPrivacyStatus.mockResolvedValue(false);
            mockPostRepository.getPostsByAuthorId.mockResolvedValue(mockPosts);
            mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockPostRepository.getCommentsByParentId.mockResolvedValue([]);
            const result = await postService.getPostsByAuthor(userId, authorId);
            (0, globals_1.expect)(result).toHaveLength(1);
            (0, globals_1.expect)(result[0]).toBeInstanceOf(dto_1.ExtendedPostDTO);
            (0, globals_1.expect)(result[0].author).toEqual(mockAuthor);
        });
        (0, globals_1.it)('should throw NotFoundException when author does not exist', async () => {
            const userId = 'user-1';
            const authorId = 'non-existent-user';
            mockUserRepository.getById.mockResolvedValue(null);
            await (0, globals_1.expect)(postService.getPostsByAuthor(userId, authorId)).rejects.toThrow('user');
        });
        (0, globals_1.it)('should throw NotFoundException when author is private and user does not follow', async () => {
            const userId = 'user-1';
            const authorId = 'user-2';
            mockUserRepository.getById.mockResolvedValue(createMockUser({ id: authorId }));
            mockPostRepository.getUserPrivacyStatus.mockResolvedValue(true);
            mockPostRepository.checkFollowRelationship.mockResolvedValue(false);
            await (0, globals_1.expect)(postService.getPostsByAuthor(userId, authorId)).rejects.toThrow('user');
        });
    });
    (0, globals_1.describe)('createComment', () => {
        (0, globals_1.it)('should create comment successfully', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const commentData = {
                content: 'This is a comment'
            };
            const mockPost = createMockPost({ id: postId, authorId: 'user-2' });
            const expectedComment = createMockPost({
                id: 'comment-1',
                parentId: postId,
                content: commentData.content
            });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.getUserPrivacyStatus.mockResolvedValue(false);
            mockPostRepository.create.mockResolvedValue(expectedComment);
            const result = await postService.createComment(userId, postId, commentData);
            (0, globals_1.expect)(result).toEqual(expectedComment);
            (0, globals_1.expect)(mockPostRepository.create).toHaveBeenCalledWith(userId, {
                content: commentData.content,
                parentId: postId
            });
        });
        (0, globals_1.it)('should throw NotFoundException when post does not exist', async () => {
            const userId = 'user-1';
            const postId = 'non-existent-post';
            const commentData = {
                content: 'This is a comment'
            };
            mockPostRepository.getById.mockResolvedValue(null);
            await (0, globals_1.expect)(postService.createComment(userId, postId, commentData)).rejects.toThrow('post');
        });
        (0, globals_1.it)('should throw NotFoundException when commenting on private user post without following', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const commentData = {
                content: 'This is a comment'
            };
            const mockPost = createMockPost({ id: postId, authorId: 'user-2' });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.getUserPrivacyStatus.mockResolvedValue(true);
            mockPostRepository.checkFollowRelationship.mockResolvedValue(false);
            await (0, globals_1.expect)(postService.createComment(userId, postId, commentData)).rejects.toThrow('post');
        });
    });
    (0, globals_1.describe)('getCommentsByPostId', () => {
        (0, globals_1.it)('should return comments for a post', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockPost = createMockPost({ id: postId, authorId: userId });
            const mockComments = [
                createMockPost({ id: 'comment-1', parentId: postId }),
                createMockPost({ id: 'comment-2', parentId: postId })
            ];
            const mockAuthor = createMockUser();
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.getCommentsByParentId.mockResolvedValue(mockComments);
            mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockUserRepository.getById.mockResolvedValue(mockAuthor);
            const result = await postService.getCommentsByPostId(userId, postId);
            (0, globals_1.expect)(result).toHaveLength(2);
            (0, globals_1.expect)(result[0]).toBeInstanceOf(dto_1.ExtendedPostDTO);
            (0, globals_1.expect)(result[0].id).toBe('comment-1');
        });
    });
    (0, globals_1.describe)('getCommentsByPostIdPaginated', () => {
        (0, globals_1.it)('should return paginated comments sorted by reactions', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const options = { limit: 5 };
            const mockPost = createMockPost({ id: postId, authorId: userId });
            const mockComments = [
                createMockPost({ id: 'comment-1', likeCount: 5, retweetCount: 2 }),
                createMockPost({ id: 'comment-2', likeCount: 1, retweetCount: 1 })
            ];
            const mockAuthor = createMockUser();
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.getCommentsByParentIdPaginated.mockResolvedValue(mockComments);
            mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockPostRepository.getCommentsByParentId.mockResolvedValue([]);
            mockUserRepository.getById.mockResolvedValue(mockAuthor);
            const result = await postService.getCommentsByPostIdPaginated(userId, postId, options);
            (0, globals_1.expect)(result).toHaveLength(2);
            (0, globals_1.expect)(result[0].qtyLikes + result[0].qtyRetweets).toBeGreaterThanOrEqual(result[1].qtyLikes + result[1].qtyRetweets);
        });
    });
    (0, globals_1.describe)('getPostsWithComments', () => {
        (0, globals_1.it)('should return post with its comments', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockPost = createMockExtendedPost({ id: postId });
            const mockComments = [createMockExtendedPost({ id: 'comment-1' })];
            globals_1.jest.spyOn(postService, 'getPost').mockResolvedValue(mockPost);
            globals_1.jest.spyOn(postService, 'getCommentsByPostId').mockResolvedValue(mockComments);
            const result = await postService.getPostsWithComments(userId, postId);
            (0, globals_1.expect)(result.id).toBe(postId);
            (0, globals_1.expect)(result.comments).toEqual(mockComments);
        });
    });
    (0, globals_1.describe)('getCommentsByUserId', () => {
        (0, globals_1.it)('should return comments by user when user exists and is public', async () => {
            const userId = 'user-1';
            const targetUserId = 'user-2';
            const mockComments = [createMockPost({ authorId: targetUserId })];
            const mockAuthor = createMockUser({ id: targetUserId });
            mockUserRepository.getById.mockResolvedValue(mockAuthor);
            mockPostRepository.getUserPrivacyStatus.mockResolvedValue(false);
            mockPostRepository.getCommentsByUserId.mockResolvedValue(mockComments);
            mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockPostRepository.getCommentsByParentId.mockResolvedValue([]);
            const result = await postService.getCommentsByUserId(userId, targetUserId);
            (0, globals_1.expect)(result).toHaveLength(1);
            (0, globals_1.expect)(result[0]).toBeInstanceOf(dto_1.ExtendedPostDTO);
        });
        (0, globals_1.it)('should throw NotFoundException when target user does not exist', async () => {
            const userId = 'user-1';
            const targetUserId = 'non-existent-user';
            mockUserRepository.getById.mockResolvedValue(null);
            await (0, globals_1.expect)(postService.getCommentsByUserId(userId, targetUserId)).rejects.toThrow('user');
        });
    });
    (0, globals_1.describe)('generatePostImageUploadUrl', () => {
        (0, globals_1.it)('should generate upload URL for post image', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const fileExt = '.jpg';
            const index = 0;
            const mockPost = createMockPost({ id: postId, authorId: userId });
            const expectedKey = 'posts/post-1/image-0.jpg';
            const expectedUploadUrl = 'https://s3.example.com/upload-url';
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.getPostImagesByPostId.mockResolvedValue([]);
            s3_1.generatePostPictureKey.mockReturnValue(expectedKey);
            s3_1.generateUploadUrl.mockResolvedValue(expectedUploadUrl);
            const result = await postService.generatePostImageUploadUrl(userId, postId, fileExt, index);
            (0, globals_1.expect)(result).toEqual({
                uploadUrl: expectedUploadUrl,
                key: expectedKey
            });
            (0, globals_1.expect)(s3_1.generatePostPictureKey).toHaveBeenCalledWith(postId, index, fileExt);
        });
        (0, globals_1.it)('should throw NotFoundException when post does not exist', async () => {
            const userId = 'user-1';
            const postId = 'non-existent-post';
            mockPostRepository.getById.mockResolvedValue(null);
            await (0, globals_1.expect)(postService.generatePostImageUploadUrl(userId, postId, '.jpg', 0)).rejects.toThrow('post');
        });
        (0, globals_1.it)('should throw ForbiddenException when user is not the post author', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockPost = createMockPost({ id: postId, authorId: 'other-user' });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            await (0, globals_1.expect)(postService.generatePostImageUploadUrl(userId, postId, '.jpg', 0)).rejects.toThrow('Forbidden');
        });
        (0, globals_1.it)('should throw ForbiddenException for invalid index', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockPost = createMockPost({ id: postId, authorId: userId });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            await (0, globals_1.expect)(postService.generatePostImageUploadUrl(userId, postId, '.jpg', -1)).rejects.toThrow('Image index must be between 0 and 3');
            await (0, globals_1.expect)(postService.generatePostImageUploadUrl(userId, postId, '.jpg', 4)).rejects.toThrow('Image index must be between 0 and 3');
        });
        (0, globals_1.it)('should throw ForbiddenException when maximum images exceeded', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockPost = createMockPost({ id: postId, authorId: userId });
            const existingImages = [
                createMockPostImage({ index: 0 }),
                createMockPostImage({ index: 1 }),
                createMockPostImage({ index: 2 }),
                createMockPostImage({ index: 3 })
            ];
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.getPostImagesByPostId.mockResolvedValue(existingImages);
            await (0, globals_1.expect)(postService.generatePostImageUploadUrl(userId, postId, '.jpg', 0)).rejects.toThrow('Maximum of 4 images per post allowed');
        });
    });
    (0, globals_1.describe)('addPostImage', () => {
        (0, globals_1.it)('should add new post image', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const s3Key = 'posts/post-1/image-0.jpg';
            const index = 0;
            const mockPost = createMockPost({ id: postId, authorId: userId });
            const expectedImage = createMockPostImage({ s3Key, index });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.getPostImagesByPostId.mockResolvedValue([]);
            mockPostRepository.createPostImage.mockResolvedValue(expectedImage);
            const result = await postService.addPostImage(userId, postId, s3Key, index);
            (0, globals_1.expect)(result).toEqual(expectedImage);
            (0, globals_1.expect)(mockPostRepository.createPostImage).toHaveBeenCalledWith({
                postId,
                s3Key,
                index
            });
        });
        (0, globals_1.it)('should update existing image at index', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const s3Key = 'posts/post-1/image-0-new.jpg';
            const index = 0;
            const mockPost = createMockPost({ id: postId, authorId: userId });
            const existingImage = createMockPostImage({ id: 'image-1', index });
            const updatedImage = createMockPostImage({ ...existingImage, s3Key });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.getPostImagesByPostId.mockResolvedValue([existingImage]);
            mockPostRepository.updatePostImage.mockResolvedValue(updatedImage);
            const result = await postService.addPostImage(userId, postId, s3Key, index);
            (0, globals_1.expect)(result).toEqual(updatedImage);
            (0, globals_1.expect)(mockPostRepository.updatePostImage).toHaveBeenCalledWith(existingImage.id, s3Key);
        });
    });
    (0, globals_1.describe)('updatePostImage', () => {
        (0, globals_1.it)('should update post image successfully', async () => {
            const userId = 'user-1';
            const imageId = 'image-1';
            const s3Key = 'new-s3-key.jpg';
            const mockImage = createMockPostImage({ id: imageId });
            const mockPost = createMockPost({ authorId: userId });
            const updatedImage = createMockPostImage({ ...mockImage, s3Key });
            mockPostRepository.getPostImagesByPostId.mockResolvedValue([mockImage]);
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.updatePostImage.mockResolvedValue(updatedImage);
            const result = await postService.updatePostImage(userId, imageId, s3Key);
            (0, globals_1.expect)(result).toEqual(updatedImage);
            (0, globals_1.expect)(mockPostRepository.updatePostImage).toHaveBeenCalledWith(imageId, s3Key);
        });
        (0, globals_1.it)('should throw NotFoundException when image does not exist', async () => {
            const userId = 'user-1';
            const imageId = 'non-existent-image';
            mockPostRepository.getPostImagesByPostId.mockResolvedValue([]);
            await (0, globals_1.expect)(postService.updatePostImage(userId, imageId, 'new-key.jpg')).rejects.toThrow('image');
        });
        (0, globals_1.it)('should throw ForbiddenException when user is not the post author', async () => {
            const userId = 'user-1';
            const imageId = 'image-1';
            const mockImage = createMockPostImage({ id: imageId });
            const mockPost = createMockPost({ authorId: 'other-user' });
            mockPostRepository.getPostImagesByPostId.mockResolvedValue([mockImage]);
            mockPostRepository.getById.mockResolvedValue(mockPost);
            await (0, globals_1.expect)(postService.updatePostImage(userId, imageId, 'new-key.jpg')).rejects.toThrow('Forbidden');
        });
    });
    (0, globals_1.describe)('deletePostImage', () => {
        (0, globals_1.it)('should delete post image successfully', async () => {
            const userId = 'user-1';
            const imageId = 'image-1';
            const mockImage = createMockPostImage({ id: imageId });
            const mockPost = createMockPost({ authorId: userId });
            mockPostRepository.getPostImagesByPostId.mockResolvedValue([mockImage]);
            mockPostRepository.getById.mockResolvedValue(mockPost);
            await postService.deletePostImage(userId, imageId);
            (0, globals_1.expect)(mockPostRepository.deletePostImage).toHaveBeenCalledWith(imageId);
        });
    });
    (0, globals_1.describe)('getPostImages', () => {
        (0, globals_1.it)('should return post images with URLs for public post', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockPost = createMockPost({ id: postId, authorId: 'user-2' });
            const mockImages = [createMockPostImage()];
            const expectedUrl = 'https://s3.example.com/image-url';
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.getUserPrivacyStatus.mockResolvedValue(false);
            mockPostRepository.getPostImagesByPostId.mockResolvedValue(mockImages);
            s3_1.getPostImageUrl.mockResolvedValue(expectedUrl);
            const result = await postService.getPostImages(userId, postId);
            (0, globals_1.expect)(result).toHaveLength(1);
            (0, globals_1.expect)(result[0].url).toBe(expectedUrl);
        });
        (0, globals_1.it)('should throw NotFoundException when user cannot access private post images', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockPost = createMockPost({ id: postId, authorId: 'user-2' });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockPostRepository.getUserPrivacyStatus.mockResolvedValue(true);
            mockPostRepository.checkFollowRelationship.mockResolvedValue(false);
            await (0, globals_1.expect)(postService.getPostImages(userId, postId)).rejects.toThrow('post');
        });
    });
    (0, globals_1.describe)('getContentTypeFromFileExt', () => {
        (0, globals_1.it)('should return correct content types', () => {
            const getContentType = postService.getContentTypeFromFileExt.bind(postService);
            (0, globals_1.expect)(getContentType('.jpg')).toBe('image/jpeg');
            (0, globals_1.expect)(getContentType('.jpeg')).toBe('image/jpeg');
            (0, globals_1.expect)(getContentType('.png')).toBe('image/png');
            (0, globals_1.expect)(getContentType('.gif')).toBe('image/gif');
            (0, globals_1.expect)(getContentType('.webp')).toBe('image/webp');
            (0, globals_1.expect)(getContentType('.unknown')).toBe('application/octet-stream');
        });
    });
    (0, globals_1.describe)('checkUserExists', () => {
        (0, globals_1.it)('should return true when user exists', async () => {
            const userId = 'user-1';
            const mockUser = createMockUser({ id: userId });
            mockUserRepository.getById.mockResolvedValue(mockUser);
            const result = await postService.checkUserExists(userId);
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('should return false when user does not exist', async () => {
            const userId = 'non-existent-user';
            mockUserRepository.getById.mockResolvedValue(null);
            const result = await postService.checkUserExists(userId);
            (0, globals_1.expect)(result).toBe(false);
        });
    });
    (0, globals_1.describe)('Edge Cases and Error Handling', () => {
        (0, globals_1.it)('should handle repository errors gracefully', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const repositoryError = new Error('Database connection failed');
            mockPostRepository.getById.mockRejectedValue(repositoryError);
            await (0, globals_1.expect)(postService.getPost(userId, postId)).rejects.toThrow('Database connection failed');
        });
        (0, globals_1.it)('should handle empty results appropriately', async () => {
            const userId = 'user-1';
            const options = { limit: 10 };
            mockPostRepository.getFollowingIds.mockResolvedValue([]);
            mockPostRepository.getPosts.mockResolvedValue([]);
            const result = await postService.getLatestPosts(userId, options);
            (0, globals_1.expect)(result).toEqual([]);
        });
        (0, globals_1.it)('should handle null/undefined reactions correctly', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockPost = createMockPost({ id: postId, authorId: userId });
            const mockAuthor = createMockUser({ id: userId });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockUserRepository.getById.mockResolvedValue(mockAuthor);
            mockPostRepository.getCommentsByParentId.mockResolvedValue([]);
            mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null);
            const result = await postService.getPost(userId, postId);
            (0, globals_1.expect)(result.hasLiked).toBe(false);
            (0, globals_1.expect)(result.hasRetweeted).toBe(false);
        });
    });
    (0, globals_1.describe)('Integration Scenarios', () => {
        (0, globals_1.it)('should handle complex privacy scenario with multiple users', async () => {
            const currentUser = 'user-1';
            const privateUser = 'user-2';
            const publicUser = 'user-3';
            const options = { limit: 10 };
            const posts = [
                createMockPost({ id: 'post-1', authorId: privateUser }),
                createMockPost({ id: 'post-2', authorId: publicUser })
            ];
            mockPostRepository.getFollowingIds.mockResolvedValue([privateUser]);
            mockPostRepository.getPosts.mockResolvedValue(posts);
            mockReactionRepository.getByPostIdAndUserId.mockResolvedValue(null);
            mockPostRepository.getCommentsByParentId.mockResolvedValue([]);
            mockUserRepository.getById
                .mockResolvedValueOnce(createMockUser({ id: privateUser, isPrivate: true }))
                .mockResolvedValueOnce(createMockUser({ id: publicUser, isPrivate: false }));
            mockPostRepository.checkFollowRelationship.mockResolvedValue(true);
            const result = await postService.getLatestPosts(currentUser, options);
            (0, globals_1.expect)(result).toHaveLength(2);
            (0, globals_1.expect)(result[0].author.isPrivate).toBe(true);
            (0, globals_1.expect)(result[1].author.isPrivate).toBe(false);
        });
        (0, globals_1.it)('should handle post with multiple images and comments', async () => {
            const userId = 'user-1';
            const postId = 'post-1';
            const mockImages = [
                createMockPostImage({ index: 0 }),
                createMockPostImage({ index: 1 })
            ];
            const mockPost = createMockPost({
                id: postId,
                authorId: userId,
                images: mockImages,
                likeCount: 10,
                retweetCount: 5
            });
            const mockComments = [
                createMockPost({ id: 'comment-1' }),
                createMockPost({ id: 'comment-2' }),
                createMockPost({ id: 'comment-3' })
            ];
            const mockAuthor = createMockUser({ id: userId });
            mockPostRepository.getById.mockResolvedValue(mockPost);
            mockUserRepository.getById.mockResolvedValue(mockAuthor);
            mockPostRepository.getCommentsByParentId.mockResolvedValue(mockComments);
            mockReactionRepository.getByPostIdAndUserId
                .mockResolvedValueOnce({ id: 'like-1' })
                .mockResolvedValueOnce({ id: 'retweet-1' });
            s3_1.getPostImageUrl.mockResolvedValue('https://s3.example.com/image-url');
            const result = await postService.getPost(userId, postId);
            (0, globals_1.expect)(result.images).toHaveLength(2);
            (0, globals_1.expect)(result.qtyComments).toBe(3);
            (0, globals_1.expect)(result.qtyLikes).toBe(10);
            (0, globals_1.expect)(result.qtyRetweets).toBe(5);
            (0, globals_1.expect)(result.hasLiked).toBe(true);
            (0, globals_1.expect)(result.hasRetweeted).toBe(true);
            (0, globals_1.expect)(result.images.every(img => img.url === 'https://s3.example.com/image-url')).toBe(true);
        });
    });
});
//# sourceMappingURL=post.service.impl.test.js.map