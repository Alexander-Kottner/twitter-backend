"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_service_impl_1 = require("./user.service.impl");
const dto_1 = require("../dto");
const errors_1 = require("../../../utils/errors");
const s3Utils = __importStar(require("../../../utils/s3"));
const globals_1 = require("@jest/globals");
globals_1.jest.mock('@utils/s3', () => ({
    generateProfilePictureKey: globals_1.jest.fn(),
    generateUploadUrl: globals_1.jest.fn(),
    getProfilePictureUrl: globals_1.jest.fn()
}));
(0, globals_1.describe)('UserServiceImpl', () => {
    let userService;
    let mockUserRepository;
    let mockFollowerRepository;
    let mockGenerateUploadUrl;
    let mockGenerateProfilePictureKey;
    let mockGetProfilePictureUrl;
    const mockUser = {
        id: 'user-1',
        name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'hashedpassword',
        isPrivate: false,
        profilePicture: 'profile-pictures/user-1/profile.jpg',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        deletedAt: null
    };
    const mockUserDTO = {
        id: 'user-1',
        name: 'John Doe',
        isPrivate: false,
        profilePicture: 'profile-pictures/user-1/profile.jpg',
        createdAt: new Date('2023-01-01')
    };
    const mockPagination = {
        limit: 10,
        skip: 0
    };
    (0, globals_1.beforeEach)(() => {
        mockUserRepository = {
            create: globals_1.jest.fn(),
            delete: globals_1.jest.fn(),
            getRecommendedUsersPaginated: globals_1.jest.fn(),
            getById: globals_1.jest.fn(),
            getByEmailOrUsername: globals_1.jest.fn(),
            updatePrivacy: globals_1.jest.fn(),
            updateProfilePicture: globals_1.jest.fn(),
            getUsersByUsername: globals_1.jest.fn()
        };
        mockFollowerRepository = {
            follow: globals_1.jest.fn(),
            unfollow: globals_1.jest.fn(),
            isFollowing: globals_1.jest.fn()
        };
        globals_1.jest.clearAllMocks();
        mockGetProfilePictureUrl = s3Utils.getProfilePictureUrl;
        mockGenerateProfilePictureKey = s3Utils.generateProfilePictureKey;
        mockGenerateUploadUrl = s3Utils.generateUploadUrl;
        mockGetProfilePictureUrl.mockReturnValue('https://example.com/profile.jpg');
        mockGenerateProfilePictureKey.mockReturnValue('profile-pictures/user-1/profile.jpg');
        mockGenerateUploadUrl.mockResolvedValue('https://example.com/upload-url');
    });
    (0, globals_1.describe)('Constructor', () => {
        (0, globals_1.it)('should create instance with repository only', () => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository);
            (0, globals_1.expect)(userService).toBeInstanceOf(user_service_impl_1.UserServiceImpl);
        });
        (0, globals_1.it)('should create instance with both repositories', () => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository, mockFollowerRepository);
            (0, globals_1.expect)(userService).toBeInstanceOf(user_service_impl_1.UserServiceImpl);
        });
    });
    (0, globals_1.describe)('getUser', () => {
        (0, globals_1.beforeEach)(() => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository, mockFollowerRepository);
        });
        (0, globals_1.it)('should return user view DTO when user exists', async () => {
            mockUserRepository.getById.mockResolvedValue(mockUser);
            mockFollowerRepository.isFollowing.mockResolvedValue(false);
            const result = await userService.getUser('user-1', 'current-user-1');
            (0, globals_1.expect)(mockUserRepository.getById).toHaveBeenCalledWith('user-1');
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).toHaveBeenCalledWith('current-user-1', 'user-1');
            (0, globals_1.expect)(s3Utils.getProfilePictureUrl).toHaveBeenCalledWith('profile-pictures/user-1/profile.jpg');
            (0, globals_1.expect)(result).toBeInstanceOf(dto_1.UserViewDTO);
            (0, globals_1.expect)(result.id).toBe('user-1');
            (0, globals_1.expect)(result.name).toBe('John Doe');
            (0, globals_1.expect)(result.username).toBe('johndoe');
            (0, globals_1.expect)(result.isFollowed).toBe(false);
        });
        (0, globals_1.it)('should throw NotFoundException when user does not exist', async () => {
            mockUserRepository.getById.mockResolvedValue(null);
            await (0, globals_1.expect)(userService.getUser('non-existent-user')).rejects.toThrow(errors_1.NotFoundException);
            (0, globals_1.expect)(mockUserRepository.getById).toHaveBeenCalledWith('non-existent-user');
        });
        (0, globals_1.it)('should not check follow status when no current user provided', async () => {
            mockUserRepository.getById.mockResolvedValue(mockUser);
            const result = await userService.getUser('user-1');
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).not.toHaveBeenCalled();
            (0, globals_1.expect)(result.isFollowed).toBe(false);
        });
        (0, globals_1.it)('should not check follow status when current user is the same as target user', async () => {
            mockUserRepository.getById.mockResolvedValue(mockUser);
            const result = await userService.getUser('user-1', 'user-1');
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).not.toHaveBeenCalled();
            (0, globals_1.expect)(result.isFollowed).toBe(false);
        });
        (0, globals_1.it)('should not check follow status when follower repository is not provided', async () => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository);
            mockUserRepository.getById.mockResolvedValue(mockUser);
            const result = await userService.getUser('user-1', 'current-user-1');
            (0, globals_1.expect)(result.isFollowed).toBe(false);
        });
        (0, globals_1.it)('should return true for isFollowed when user is following', async () => {
            mockUserRepository.getById.mockResolvedValue(mockUser);
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            const result = await userService.getUser('user-1', 'current-user-1');
            (0, globals_1.expect)(result.isFollowed).toBe(true);
        });
        (0, globals_1.it)('should handle user with null profile picture', async () => {
            const userWithoutPicture = { ...mockUser, profilePicture: null };
            mockUserRepository.getById.mockResolvedValue(userWithoutPicture);
            const result = await userService.getUser('user-1');
            (0, globals_1.expect)(s3Utils.getProfilePictureUrl).not.toHaveBeenCalled();
            (0, globals_1.expect)(result.profilePicture).toBeNull();
        });
        (0, globals_1.it)('should handle user with null name', async () => {
            const userWithoutName = { ...mockUser, name: null };
            mockUserRepository.getById.mockResolvedValue(userWithoutName);
            const result = await userService.getUser('user-1');
            (0, globals_1.expect)(result.name).toBe('');
        });
    });
    (0, globals_1.describe)('getUserRecommendations', () => {
        (0, globals_1.beforeEach)(() => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository, mockFollowerRepository);
        });
        (0, globals_1.it)('should return user recommendations with follow status', async () => {
            const mockUsers = [mockUser, { ...mockUser, id: 'user-2', username: 'jane' }];
            mockUserRepository.getRecommendedUsersPaginated.mockResolvedValue(mockUsers);
            mockFollowerRepository.isFollowing.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
            const result = await userService.getUserRecommendations('current-user', mockPagination);
            (0, globals_1.expect)(mockUserRepository.getRecommendedUsersPaginated).toHaveBeenCalledWith(mockPagination);
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(result).toHaveLength(2);
            (0, globals_1.expect)(result[0].isFollowed).toBe(false);
            (0, globals_1.expect)(result[1].isFollowed).toBe(true);
        });
        (0, globals_1.it)('should not check follow status for same user', async () => {
            const mockUsers = [{ ...mockUser, id: 'current-user' }];
            mockUserRepository.getRecommendedUsersPaginated.mockResolvedValue(mockUsers);
            const result = await userService.getUserRecommendations('current-user', mockPagination);
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).not.toHaveBeenCalled();
            (0, globals_1.expect)(result[0].isFollowed).toBe(false);
        });
        (0, globals_1.it)('should handle users without follower repository', async () => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository);
            const mockUsers = [mockUser];
            mockUserRepository.getRecommendedUsersPaginated.mockResolvedValue(mockUsers);
            const result = await userService.getUserRecommendations('current-user', mockPagination);
            (0, globals_1.expect)(result[0].isFollowed).toBe(false);
        });
        (0, globals_1.it)('should handle empty recommendations list', async () => {
            mockUserRepository.getRecommendedUsersPaginated.mockResolvedValue([]);
            const result = await userService.getUserRecommendations('current-user', mockPagination);
            (0, globals_1.expect)(result).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('getUsersByUsername', () => {
        (0, globals_1.beforeEach)(() => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository, mockFollowerRepository);
        });
        (0, globals_1.it)('should return users by username with follow status', async () => {
            const mockUsers = [mockUser];
            mockUserRepository.getUsersByUsername.mockResolvedValue(mockUsers);
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            const result = await userService.getUsersByUsername('john', mockPagination, 'current-user');
            (0, globals_1.expect)(mockUserRepository.getUsersByUsername).toHaveBeenCalledWith('john', mockPagination);
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).toHaveBeenCalledWith('current-user', 'user-1');
            (0, globals_1.expect)(result[0].isFollowed).toBe(true);
        });
        (0, globals_1.it)('should work without current user', async () => {
            const mockUsers = [mockUser];
            mockUserRepository.getUsersByUsername.mockResolvedValue(mockUsers);
            const result = await userService.getUsersByUsername('john', mockPagination);
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).not.toHaveBeenCalled();
            (0, globals_1.expect)(result[0].isFollowed).toBe(false);
        });
        (0, globals_1.it)('should not check follow status for same user', async () => {
            const mockUsers = [{ ...mockUser, id: 'current-user' }];
            mockUserRepository.getUsersByUsername.mockResolvedValue(mockUsers);
            const result = await userService.getUsersByUsername('john', mockPagination, 'current-user');
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).not.toHaveBeenCalled();
            (0, globals_1.expect)(result[0].isFollowed).toBe(false);
        });
    });
    (0, globals_1.describe)('deleteUser', () => {
        (0, globals_1.beforeEach)(() => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository);
        });
        (0, globals_1.it)('should call repository delete method', async () => {
            await userService.deleteUser('user-1');
            (0, globals_1.expect)(mockUserRepository.delete).toHaveBeenCalledWith('user-1');
        });
    });
    (0, globals_1.describe)('updatePrivacy', () => {
        (0, globals_1.beforeEach)(() => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository);
        });
        (0, globals_1.it)('should update user privacy when user exists', async () => {
            mockUserRepository.getById.mockResolvedValue(mockUser);
            mockUserRepository.updatePrivacy.mockResolvedValue(mockUserDTO);
            const result = await userService.updatePrivacy('user-1', true);
            (0, globals_1.expect)(mockUserRepository.getById).toHaveBeenCalledWith('user-1');
            (0, globals_1.expect)(mockUserRepository.updatePrivacy).toHaveBeenCalledWith('user-1', true);
            (0, globals_1.expect)(result).toBe(mockUserDTO);
        });
        (0, globals_1.it)('should throw NotFoundException when user does not exist', async () => {
            mockUserRepository.getById.mockResolvedValue(null);
            await (0, globals_1.expect)(userService.updatePrivacy('non-existent', true)).rejects.toThrow(errors_1.NotFoundException);
            (0, globals_1.expect)(mockUserRepository.updatePrivacy).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('updateProfilePicture', () => {
        (0, globals_1.beforeEach)(() => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository);
        });
        (0, globals_1.it)('should update profile picture when user exists', async () => {
            mockUserRepository.getById.mockResolvedValue(mockUser);
            mockUserRepository.updateProfilePicture.mockResolvedValue(mockUserDTO);
            const result = await userService.updateProfilePicture('user-1', 'new-picture-key');
            (0, globals_1.expect)(mockUserRepository.getById).toHaveBeenCalledWith('user-1');
            (0, globals_1.expect)(mockUserRepository.updateProfilePicture).toHaveBeenCalledWith('user-1', 'new-picture-key');
            (0, globals_1.expect)(result).toBe(mockUserDTO);
        });
        (0, globals_1.it)('should throw NotFoundException when user does not exist', async () => {
            mockUserRepository.getById.mockResolvedValue(null);
            await (0, globals_1.expect)(userService.updateProfilePicture('non-existent', 'picture')).rejects.toThrow(errors_1.NotFoundException);
            (0, globals_1.expect)(mockUserRepository.updateProfilePicture).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('generateProfilePictureUploadUrl', () => {
        (0, globals_1.beforeEach)(() => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository);
        });
        (0, globals_1.it)('should generate upload URL for valid user and file extension', async () => {
            mockUserRepository.getById.mockResolvedValue(mockUser);
            const result = await userService.generateProfilePictureUploadUrl('user-1', '.jpg');
            (0, globals_1.expect)(mockUserRepository.getById).toHaveBeenCalledWith('user-1');
            (0, globals_1.expect)(s3Utils.generateProfilePictureKey).toHaveBeenCalledWith('user-1', '.jpg');
            (0, globals_1.expect)(s3Utils.generateUploadUrl).toHaveBeenCalledWith('profile-pictures/user-1/profile.jpg', 'image/jpeg');
            (0, globals_1.expect)(result).toEqual({
                uploadUrl: 'https://example.com/upload-url',
                key: 'profile-pictures/user-1/profile.jpg'
            });
        });
        (0, globals_1.it)('should throw NotFoundException when user does not exist', async () => {
            mockUserRepository.getById.mockResolvedValue(null);
            await (0, globals_1.expect)(userService.generateProfilePictureUploadUrl('non-existent', '.jpg')).rejects.toThrow(errors_1.NotFoundException);
            (0, globals_1.expect)(s3Utils.generateProfilePictureKey).not.toHaveBeenCalled();
            (0, globals_1.expect)(s3Utils.generateUploadUrl).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle different file extensions correctly', async () => {
            mockUserRepository.getById.mockResolvedValue(mockUser);
            await userService.generateProfilePictureUploadUrl('user-1', '.jpeg');
            (0, globals_1.expect)(s3Utils.generateUploadUrl).toHaveBeenCalledWith(globals_1.expect.any(String), 'image/jpeg');
            await userService.generateProfilePictureUploadUrl('user-1', '.png');
            (0, globals_1.expect)(s3Utils.generateUploadUrl).toHaveBeenCalledWith(globals_1.expect.any(String), 'image/png');
            await userService.generateProfilePictureUploadUrl('user-1', '.gif');
            (0, globals_1.expect)(s3Utils.generateUploadUrl).toHaveBeenCalledWith(globals_1.expect.any(String), 'image/gif');
            await userService.generateProfilePictureUploadUrl('user-1', '.webp');
            (0, globals_1.expect)(s3Utils.generateUploadUrl).toHaveBeenCalledWith(globals_1.expect.any(String), 'image/webp');
            await userService.generateProfilePictureUploadUrl('user-1', '.unknown');
            (0, globals_1.expect)(s3Utils.generateUploadUrl).toHaveBeenCalledWith(globals_1.expect.any(String), 'application/octet-stream');
        });
        (0, globals_1.it)('should handle case-insensitive file extensions', async () => {
            mockUserRepository.getById.mockResolvedValue(mockUser);
            await userService.generateProfilePictureUploadUrl('user-1', '.JPG');
            (0, globals_1.expect)(s3Utils.generateUploadUrl).toHaveBeenCalledWith(globals_1.expect.any(String), 'image/jpeg');
            await userService.generateProfilePictureUploadUrl('user-1', '.PNG');
            (0, globals_1.expect)(s3Utils.generateUploadUrl).toHaveBeenCalledWith(globals_1.expect.any(String), 'image/png');
        });
    });
    (0, globals_1.describe)('getContentTypeFromFileExt (private method testing through public interface)', () => {
        (0, globals_1.beforeEach)(() => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository);
            mockUserRepository.getById.mockResolvedValue(mockUser);
        });
        (0, globals_1.it)('should return correct content types for supported formats', async () => {
            const testCases = [
                { ext: '.jpg', expected: 'image/jpeg' },
                { ext: '.jpeg', expected: 'image/jpeg' },
                { ext: '.png', expected: 'image/png' },
                { ext: '.gif', expected: 'image/gif' },
                { ext: '.webp', expected: 'image/webp' },
                { ext: '.JPG', expected: 'image/jpeg' },
                { ext: '.JPEG', expected: 'image/jpeg' },
                { ext: '.PNG', expected: 'image/png' },
                { ext: '.unknown', expected: 'application/octet-stream' },
                { ext: '', expected: 'application/octet-stream' }
            ];
            for (const testCase of testCases) {
                await userService.generateProfilePictureUploadUrl('user-1', testCase.ext);
                (0, globals_1.expect)(s3Utils.generateUploadUrl).toHaveBeenCalledWith(globals_1.expect.any(String), testCase.expected);
            }
        });
    });
    (0, globals_1.describe)('Error handling and edge cases', () => {
        (0, globals_1.beforeEach)(() => {
            userService = new user_service_impl_1.UserServiceImpl(mockUserRepository, mockFollowerRepository);
        });
        (0, globals_1.it)('should handle repository errors gracefully', async () => {
            mockUserRepository.getById.mockRejectedValue(new Error('Database error'));
            await (0, globals_1.expect)(userService.getUser('user-1')).rejects.toThrow('Database error');
        });
        (0, globals_1.it)('should handle follower repository errors gracefully', async () => {
            mockUserRepository.getById.mockResolvedValue(mockUser);
            mockFollowerRepository.isFollowing.mockRejectedValue(new Error('Follower service error'));
            await (0, globals_1.expect)(userService.getUser('user-1', 'current-user')).rejects.toThrow('Follower service error');
        });
        (0, globals_1.it)('should handle S3 upload URL generation error', async () => {
            mockUserRepository.getById.mockResolvedValue(mockUser);
            mockGenerateUploadUrl.mockRejectedValue(new Error('S3 error'));
            await (0, globals_1.expect)(userService.generateProfilePictureUploadUrl(mockUser.id, '.jpeg')).rejects.toThrow('S3 error');
            (0, globals_1.expect)(mockUserRepository.getById).toHaveBeenCalledWith(mockUser.id);
            (0, globals_1.expect)(mockGenerateProfilePictureKey).toHaveBeenCalledWith(mockUser.id, '.jpeg');
            (0, globals_1.expect)(mockGenerateUploadUrl).toHaveBeenCalledWith('profile-pictures/user-1/profile.jpg', 'image/jpeg');
        });
    });
});
//# sourceMappingURL=user.service.impl.test.js.map