import { PrismaClient } from '@prisma/client'
import { FollowDTO } from '../dto'
import { FollowerRepository } from './follower.repository'

// Define a type that matches the structure of a Follow from Prisma
type Follow = {
  id: string
  followerId: string
  followedId: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class FollowerRepositoryImpl implements FollowerRepository {
  constructor (private readonly db: PrismaClient) {}

  async follow (followerId: string, followedId: string): Promise<FollowDTO> {
    const follow = await this.db.follow.create({
      data: {
        followerId,
        followedId
      }
    })
    return new FollowDTO(follow)
  }

  async unfollow (followerId: string, followedId: string): Promise<void> {
    await this.db.follow.deleteMany({
      where: {
        followerId,
        followedId
      }
    })
  }

  async isFollowing (followerId: string, followedId: string): Promise<boolean> {
    const follow = await this.db.follow.findFirst({
      where: {
        followerId,
        followedId,
        deletedAt: null
      }
    })
    return !!follow
  }
} 