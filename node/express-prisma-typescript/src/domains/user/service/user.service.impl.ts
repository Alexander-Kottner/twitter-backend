import { NotFoundException } from '@utils/errors'
import { OffsetPagination } from 'types'
import { UserDTO, UserViewDTO } from '../dto'
import { UserRepository } from '../repository'
import { UserService } from './user.service'
import { generateProfilePictureKey, generateUploadUrl, getProfilePictureUrl } from '@utils/s3'
import { FollowerRepository } from '@domains/follower/repository'

export class UserServiceImpl implements UserService {
  constructor (
    private readonly repository: UserRepository,
    private readonly followerRepository?: FollowerRepository
  ) {}

  async getUser (userId: any, currentUserId?: string): Promise<UserViewDTO> {
    const user = await this.repository.getById(userId)
    if (!user) throw new NotFoundException('user')
    
    let isFollowed = false
    if (currentUserId && this.followerRepository && currentUserId !== userId) {
      isFollowed = await this.followerRepository.isFollowing(currentUserId, userId)
    }
    
    // Generate public URL for profile picture if it exists
    const profilePictureUrl = user.profilePicture ? getProfilePictureUrl(user.profilePicture) : null
    
    return new UserViewDTO({
      id: user.id,
      name: user.name || '',
      username: user.username,
      profilePicture: profilePictureUrl,
      isPrivate: user.isPrivate,
      isFollowed
    })
  }

  async getUserRecommendations (userId: any, options: OffsetPagination): Promise<UserViewDTO[]> {
    // TODO: make this return only users followed by users the original user follows
    const users = await this.repository.getRecommendedUsersPaginated(options)
    return Promise.all(users.map(async user => {
      let isFollowed = false
      if (this.followerRepository && userId !== user.id) {
        isFollowed = await this.followerRepository.isFollowing(userId, user.id)
      }
      
      // Generate public URL for profile picture if it exists
      const profilePictureUrl = user.profilePicture ? getProfilePictureUrl(user.profilePicture) : null
      
      return new UserViewDTO({
        id: user.id,
        name: user.name || '',
        username: user.username,
        profilePicture: profilePictureUrl,
        isPrivate: user.isPrivate,
        isFollowed
      })
    }))
  }

  async getUsersByUsername (username: string, options: OffsetPagination, currentUserId?: string): Promise<UserViewDTO[]> {
    const users = await this.repository.getUsersByUsername(username, options)
    return Promise.all(users.map(async user => {
      let isFollowed = false
      if (currentUserId && this.followerRepository && currentUserId !== user.id) {
        isFollowed = await this.followerRepository.isFollowing(currentUserId, user.id)
      }
      
      // Generate public URL for profile picture if it exists
      const profilePictureUrl = user.profilePicture ? getProfilePictureUrl(user.profilePicture) : null
      
      return new UserViewDTO({
        id: user.id,
        name: user.name || '',
        username: user.username,
        profilePicture: profilePictureUrl,
        isPrivate: user.isPrivate,
        isFollowed
      })
    }))
  }

  async deleteUser (userId: any): Promise<void> {
    await this.repository.delete(userId)
  }

  async updatePrivacy (userId: string, isPrivate: boolean): Promise<UserDTO> {
    const user = await this.repository.getById(userId)
    if (!user) throw new NotFoundException('user')
    
    return await this.repository.updatePrivacy(userId, isPrivate)
  }

  async updateProfilePicture (userId: string, profilePicture: string): Promise<UserDTO> {
    const user = await this.repository.getById(userId)
    if (!user) throw new NotFoundException('user')
    
    return await this.repository.updateProfilePicture(userId, profilePicture)
  }

  async generateProfilePictureUploadUrl (userId: string, fileExt: string): Promise<{ uploadUrl: string, key: string }> {
    const user = await this.repository.getById(userId)
    if (!user) throw new NotFoundException('user')
    
    const key = generateProfilePictureKey(userId, fileExt)
    const contentType = this.getContentTypeFromFileExt(fileExt)
    const uploadUrl = await generateUploadUrl(key, contentType)
    
    return { uploadUrl, key }
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
