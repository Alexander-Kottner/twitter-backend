import { BadRequestException, NotFoundException } from '@utils/errors'
import { FollowDTO } from '../dto'
import { FollowerRepository } from '../repository'
import { FollowerService } from './follower.service'

export class FollowerServiceImpl implements FollowerService {
  constructor (private readonly repository: FollowerRepository) {}

  async followUser (followerId: string, followedId: string): Promise<FollowDTO> {
    // Check if user is trying to follow themselves
    if (followerId === followedId) {
      throw new BadRequestException('No puedes seguirte a ti mismo')
    }
    
    // Check if already following
    const isAlreadyFollowing = await this.repository.isFollowing(followerId, followedId)
    if (isAlreadyFollowing) {
      throw new BadRequestException('Ya sigues a este usuario')
    }

    return await this.repository.follow(followerId, followedId)
  }

  async unfollowUser (followerId: string, followedId: string): Promise<void> {
    // Check if user is trying to unfollow themselves
    if (followerId === followedId) {
      throw new BadRequestException('No puedes dejar de seguirte a ti mismo')
    }

    // Check if following exists
    const isFollowing = await this.repository.isFollowing(followerId, followedId)
    if (!isFollowing) {
      throw new NotFoundException('No sigues a este usuario')
    }

    await this.repository.unfollow(followerId, followedId)
  }
} 