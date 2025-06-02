import { UserServiceImpl } from './user.service.impl'
import { UserRepository } from '../repository'
import { FollowerRepository } from '@domains/follower/repository'
import { UserDTO, UserViewDTO, ExtendedUserDTO } from '../dto'
import { NotFoundException } from '@utils/errors'
import { OffsetPagination } from 'types'
import * as s3Utils from '@utils/s3'
import { jest, describe, beforeEach, expect, it} from '@jest/globals'

// Mock the S3 utilities
jest.mock('@utils/s3', () => ({
  generateProfilePictureKey: jest.fn(),
  generateUploadUrl: jest.fn(),
  getProfilePictureUrl: jest.fn()
}))

describe('UserServiceImpl', () => {
  let userService: UserServiceImpl
  let mockUserRepository: jest.Mocked<UserRepository>
  let mockFollowerRepository: jest.Mocked<FollowerRepository>
  let mockGenerateUploadUrl: jest.MockedFunction<typeof s3Utils.generateUploadUrl>
  let mockGenerateProfilePictureKey: jest.MockedFunction<typeof s3Utils.generateProfilePictureKey>
  let mockGetProfilePictureUrl: jest.MockedFunction<typeof s3Utils.getProfilePictureUrl>

  // Mock data
  const mockUser: ExtendedUserDTO = {
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
  } as ExtendedUserDTO

  const mockUserDTO: UserDTO = {
    id: 'user-1',
    name: 'John Doe',
    isPrivate: false,
    profilePicture: 'profile-pictures/user-1/profile.jpg',
    createdAt: new Date('2023-01-01')
  }

  const mockPagination: OffsetPagination = {
    limit: 10,
    skip: 0
  }

  beforeEach(() => {
    // Create mocked repositories
    mockUserRepository = {
      create: jest.fn(),
      delete: jest.fn(),
      getRecommendedUsersPaginated: jest.fn(),
      getById: jest.fn(),
      getByEmailOrUsername: jest.fn(),
      updatePrivacy: jest.fn(),
      updateProfilePicture: jest.fn(),
      getUsersByUsername: jest.fn()
    }

    mockFollowerRepository = {
      follow: jest.fn(),
      unfollow: jest.fn(),
      isFollowing: jest.fn()
    }

    // Clear all mocks
    jest.clearAllMocks()

    // Setup S3 utility mocks with proper typing
    mockGetProfilePictureUrl = s3Utils.getProfilePictureUrl as jest.MockedFunction<typeof s3Utils.getProfilePictureUrl>
    mockGenerateProfilePictureKey = s3Utils.generateProfilePictureKey as jest.MockedFunction<typeof s3Utils.generateProfilePictureKey>
    mockGenerateUploadUrl = s3Utils.generateUploadUrl as jest.MockedFunction<typeof s3Utils.generateUploadUrl>
    
    mockGetProfilePictureUrl.mockReturnValue('https://example.com/profile.jpg')
    mockGenerateProfilePictureKey.mockReturnValue('profile-pictures/user-1/profile.jpg')
    mockGenerateUploadUrl.mockResolvedValue('https://example.com/upload-url')
  })

  describe('Constructor', () => {
    it('should create instance with repository only', () => {
      userService = new UserServiceImpl(mockUserRepository)
      expect(userService).toBeInstanceOf(UserServiceImpl)
    })

    it('should create instance with both repositories', () => {
      userService = new UserServiceImpl(mockUserRepository, mockFollowerRepository)
      expect(userService).toBeInstanceOf(UserServiceImpl)
    })
  })

  describe('getUser', () => {
    beforeEach(() => {
      userService = new UserServiceImpl(mockUserRepository, mockFollowerRepository)
    })

    it('should return user view DTO when user exists', async () => {
      mockUserRepository.getById.mockResolvedValue(mockUser)
      mockFollowerRepository.isFollowing.mockResolvedValue(false)

      const result = await userService.getUser('user-1', 'current-user-1')

      expect(mockUserRepository.getById).toHaveBeenCalledWith('user-1')
      expect(mockFollowerRepository.isFollowing).toHaveBeenCalledWith('current-user-1', 'user-1')
      expect(s3Utils.getProfilePictureUrl).toHaveBeenCalledWith('profile-pictures/user-1/profile.jpg')
      expect(result).toBeInstanceOf(UserViewDTO)
      expect(result.id).toBe('user-1')
      expect(result.name).toBe('John Doe')
      expect(result.username).toBe('johndoe')
      expect(result.isFollowed).toBe(false)
    })

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.getById.mockResolvedValue(null)

      await expect(userService.getUser('non-existent-user')).rejects.toThrow(NotFoundException)
      expect(mockUserRepository.getById).toHaveBeenCalledWith('non-existent-user')
    })

    it('should not check follow status when no current user provided', async () => {
      mockUserRepository.getById.mockResolvedValue(mockUser)

      const result = await userService.getUser('user-1')

      expect(mockFollowerRepository.isFollowing).not.toHaveBeenCalled()
      expect(result.isFollowed).toBe(false)
    })

    it('should not check follow status when current user is the same as target user', async () => {
      mockUserRepository.getById.mockResolvedValue(mockUser)

      const result = await userService.getUser('user-1', 'user-1')

      expect(mockFollowerRepository.isFollowing).not.toHaveBeenCalled()
      expect(result.isFollowed).toBe(false)
    })

    it('should not check follow status when follower repository is not provided', async () => {
      userService = new UserServiceImpl(mockUserRepository) // No follower repository
      mockUserRepository.getById.mockResolvedValue(mockUser)

      const result = await userService.getUser('user-1', 'current-user-1')

      expect(result.isFollowed).toBe(false)
    })

    it('should return true for isFollowed when user is following', async () => {
      mockUserRepository.getById.mockResolvedValue(mockUser)
      mockFollowerRepository.isFollowing.mockResolvedValue(true)

      const result = await userService.getUser('user-1', 'current-user-1')

      expect(result.isFollowed).toBe(true)
    })

    it('should handle user with null profile picture', async () => {
      const userWithoutPicture = { ...mockUser, profilePicture: null }
      mockUserRepository.getById.mockResolvedValue(userWithoutPicture)

      const result = await userService.getUser('user-1')

      expect(s3Utils.getProfilePictureUrl).not.toHaveBeenCalled()
      expect(result.profilePicture).toBeNull()
    })

    it('should handle user with null name', async () => {
      const userWithoutName = { ...mockUser, name: null }
      mockUserRepository.getById.mockResolvedValue(userWithoutName)

      const result = await userService.getUser('user-1')

      expect(result.name).toBe('')
    })
  })

  describe('getUserRecommendations', () => {
    beforeEach(() => {
      userService = new UserServiceImpl(mockUserRepository, mockFollowerRepository)
    })

    it('should return user recommendations with follow status', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 'user-2', username: 'jane' }]
      mockUserRepository.getRecommendedUsersPaginated.mockResolvedValue(mockUsers)
      mockFollowerRepository.isFollowing.mockResolvedValueOnce(false).mockResolvedValueOnce(true)

      const result = await userService.getUserRecommendations('current-user', mockPagination)

      expect(mockUserRepository.getRecommendedUsersPaginated).toHaveBeenCalledWith(mockPagination)
      expect(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(2)
      expect(result[0].isFollowed).toBe(false)
      expect(result[1].isFollowed).toBe(true)
    })

    it('should not check follow status for same user', async () => {
      const mockUsers = [{ ...mockUser, id: 'current-user' }]
      mockUserRepository.getRecommendedUsersPaginated.mockResolvedValue(mockUsers)

      const result = await userService.getUserRecommendations('current-user', mockPagination)

      expect(mockFollowerRepository.isFollowing).not.toHaveBeenCalled()
      expect(result[0].isFollowed).toBe(false)
    })

    it('should handle users without follower repository', async () => {
      userService = new UserServiceImpl(mockUserRepository)
      const mockUsers = [mockUser]
      mockUserRepository.getRecommendedUsersPaginated.mockResolvedValue(mockUsers)

      const result = await userService.getUserRecommendations('current-user', mockPagination)

      expect(result[0].isFollowed).toBe(false)
    })

    it('should handle empty recommendations list', async () => {
      mockUserRepository.getRecommendedUsersPaginated.mockResolvedValue([])

      const result = await userService.getUserRecommendations('current-user', mockPagination)

      expect(result).toHaveLength(0)
    })
  })

  describe('getUsersByUsername', () => {
    beforeEach(() => {
      userService = new UserServiceImpl(mockUserRepository, mockFollowerRepository)
    })

    it('should return users by username with follow status', async () => {
      const mockUsers = [mockUser]
      mockUserRepository.getUsersByUsername.mockResolvedValue(mockUsers)
      mockFollowerRepository.isFollowing.mockResolvedValue(true)

      const result = await userService.getUsersByUsername('john', mockPagination, 'current-user')

      expect(mockUserRepository.getUsersByUsername).toHaveBeenCalledWith('john', mockPagination)
      expect(mockFollowerRepository.isFollowing).toHaveBeenCalledWith('current-user', 'user-1')
      expect(result[0].isFollowed).toBe(true)
    })

    it('should work without current user', async () => {
      const mockUsers = [mockUser]
      mockUserRepository.getUsersByUsername.mockResolvedValue(mockUsers)

      const result = await userService.getUsersByUsername('john', mockPagination)

      expect(mockFollowerRepository.isFollowing).not.toHaveBeenCalled()
      expect(result[0].isFollowed).toBe(false)
    })

    it('should not check follow status for same user', async () => {
      const mockUsers = [{ ...mockUser, id: 'current-user' }]
      mockUserRepository.getUsersByUsername.mockResolvedValue(mockUsers)

      const result = await userService.getUsersByUsername('john', mockPagination, 'current-user')

      expect(mockFollowerRepository.isFollowing).not.toHaveBeenCalled()
      expect(result[0].isFollowed).toBe(false)
    })
  })

  describe('deleteUser', () => {
    beforeEach(() => {
      userService = new UserServiceImpl(mockUserRepository)
    })

    it('should call repository delete method', async () => {
      await userService.deleteUser('user-1')

      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-1')
    })
  })

  describe('updatePrivacy', () => {
    beforeEach(() => {
      userService = new UserServiceImpl(mockUserRepository)
    })

    it('should update user privacy when user exists', async () => {
      mockUserRepository.getById.mockResolvedValue(mockUser)
      mockUserRepository.updatePrivacy.mockResolvedValue(mockUserDTO)

      const result = await userService.updatePrivacy('user-1', true)

      expect(mockUserRepository.getById).toHaveBeenCalledWith('user-1')
      expect(mockUserRepository.updatePrivacy).toHaveBeenCalledWith('user-1', true)
      expect(result).toBe(mockUserDTO)
    })

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.getById.mockResolvedValue(null)

      await expect(userService.updatePrivacy('non-existent', true)).rejects.toThrow(NotFoundException)
      expect(mockUserRepository.updatePrivacy).not.toHaveBeenCalled()
    })
  })

  describe('updateProfilePicture', () => {
    beforeEach(() => {
      userService = new UserServiceImpl(mockUserRepository)
    })

    it('should update profile picture when user exists', async () => {
      mockUserRepository.getById.mockResolvedValue(mockUser)
      mockUserRepository.updateProfilePicture.mockResolvedValue(mockUserDTO)

      const result = await userService.updateProfilePicture('user-1', 'new-picture-key')

      expect(mockUserRepository.getById).toHaveBeenCalledWith('user-1')
      expect(mockUserRepository.updateProfilePicture).toHaveBeenCalledWith('user-1', 'new-picture-key')
      expect(result).toBe(mockUserDTO)
    })

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.getById.mockResolvedValue(null)

      await expect(userService.updateProfilePicture('non-existent', 'picture')).rejects.toThrow(NotFoundException)
      expect(mockUserRepository.updateProfilePicture).not.toHaveBeenCalled()
    })
  })

  describe('generateProfilePictureUploadUrl', () => {
    beforeEach(() => {
      userService = new UserServiceImpl(mockUserRepository)
    })

    it('should generate upload URL for valid user and file extension', async () => {
      mockUserRepository.getById.mockResolvedValue(mockUser)

      const result = await userService.generateProfilePictureUploadUrl('user-1', '.jpg')

      expect(mockUserRepository.getById).toHaveBeenCalledWith('user-1')
      expect(s3Utils.generateProfilePictureKey).toHaveBeenCalledWith('user-1', '.jpg')
      expect(s3Utils.generateUploadUrl).toHaveBeenCalledWith('profile-pictures/user-1/profile.jpg', 'image/jpeg')
      expect(result).toEqual({
        uploadUrl: 'https://example.com/upload-url',
        key: 'profile-pictures/user-1/profile.jpg'
      })
    })

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.getById.mockResolvedValue(null)

      await expect(userService.generateProfilePictureUploadUrl('non-existent', '.jpg')).rejects.toThrow(NotFoundException)
      expect(s3Utils.generateProfilePictureKey).not.toHaveBeenCalled()
      expect(s3Utils.generateUploadUrl).not.toHaveBeenCalled()
    })

    it('should handle different file extensions correctly', async () => {
      mockUserRepository.getById.mockResolvedValue(mockUser)

      // Test JPEG
      await userService.generateProfilePictureUploadUrl('user-1', '.jpeg')
      expect(s3Utils.generateUploadUrl).toHaveBeenCalledWith(expect.any(String), 'image/jpeg')

      // Test PNG
      await userService.generateProfilePictureUploadUrl('user-1', '.png')
      expect(s3Utils.generateUploadUrl).toHaveBeenCalledWith(expect.any(String), 'image/png')

      // Test GIF
      await userService.generateProfilePictureUploadUrl('user-1', '.gif')
      expect(s3Utils.generateUploadUrl).toHaveBeenCalledWith(expect.any(String), 'image/gif')

      // Test WebP
      await userService.generateProfilePictureUploadUrl('user-1', '.webp')
      expect(s3Utils.generateUploadUrl).toHaveBeenCalledWith(expect.any(String), 'image/webp')

      // Test unknown extension
      await userService.generateProfilePictureUploadUrl('user-1', '.unknown')
      expect(s3Utils.generateUploadUrl).toHaveBeenCalledWith(expect.any(String), 'application/octet-stream')
    })

    it('should handle case-insensitive file extensions', async () => {
      mockUserRepository.getById.mockResolvedValue(mockUser)

      await userService.generateProfilePictureUploadUrl('user-1', '.JPG')
      expect(s3Utils.generateUploadUrl).toHaveBeenCalledWith(expect.any(String), 'image/jpeg')

      await userService.generateProfilePictureUploadUrl('user-1', '.PNG')
      expect(s3Utils.generateUploadUrl).toHaveBeenCalledWith(expect.any(String), 'image/png')
    })
  })

  describe('getContentTypeFromFileExt (private method testing through public interface)', () => {
    beforeEach(() => {
      userService = new UserServiceImpl(mockUserRepository)
      mockUserRepository.getById.mockResolvedValue(mockUser)
    })

    it('should return correct content types for supported formats', async () => {
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
      ]

      for (const testCase of testCases) {
        await userService.generateProfilePictureUploadUrl('user-1', testCase.ext)
        expect(s3Utils.generateUploadUrl).toHaveBeenCalledWith(expect.any(String), testCase.expected)
      }
    })
  })

  describe('Error handling and edge cases', () => {
    beforeEach(() => {
      userService = new UserServiceImpl(mockUserRepository, mockFollowerRepository)
    })

    it('should handle repository errors gracefully', async () => {
      mockUserRepository.getById.mockRejectedValue(new Error('Database error'))

      await expect(userService.getUser('user-1')).rejects.toThrow('Database error')
    })

    it('should handle follower repository errors gracefully', async () => {
      mockUserRepository.getById.mockResolvedValue(mockUser)
      mockFollowerRepository.isFollowing.mockRejectedValue(new Error('Follower service error'))

      await expect(userService.getUser('user-1', 'current-user')).rejects.toThrow('Follower service error')
    })

    it('should handle S3 upload URL generation error', async () => {
      // Mock repository to return user
      mockUserRepository.getById.mockResolvedValue(mockUser)
      
      // Mock S3 to throw error
      mockGenerateUploadUrl.mockRejectedValue(new Error('S3 error'))

      // Call the method and expect it to throw
      await expect(
        userService.generateProfilePictureUploadUrl(mockUser.id, '.jpeg')
      ).rejects.toThrow('S3 error')

      // Verify repository was called
      expect(mockUserRepository.getById).toHaveBeenCalledWith(mockUser.id)
      expect(mockGenerateProfilePictureKey).toHaveBeenCalledWith(mockUser.id, '.jpeg')
      expect(mockGenerateUploadUrl).toHaveBeenCalledWith('profile-pictures/user-1/profile.jpg', 'image/jpeg')
    })
  })
})