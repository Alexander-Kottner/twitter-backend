import { PrismaClient } from '@prisma/client'

import { CursorPagination } from '@types'

import { PostRepository } from '.'
import { CreatePostInputDTO, PostDTO } from '../dto'

// Define a type that matches the actual Prisma Post schema
type PrismaPost = {
  id: string;
  authorId: string;
  content: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class PostRepositoryImpl implements PostRepository {
  constructor (private readonly db: PrismaClient) {}

  async create (userId: string, data: CreatePostInputDTO): Promise<PostDTO> {
    const post = await this.db.post.create({
      data: {
        authorId: userId,
        ...data
      }
    })
    return this.mapPostToDTO(post)
  }

  // Helper method to convert Prisma Post to PostDTO
  private mapPostToDTO(post: any): PostDTO {
    return new PostDTO({
      id: post.id,
      authorId: post.authorId,
      content: post.content,
      images: post.images,
      createdAt: post.createdAt,
      parentId: post.parentId
    });
  }

  async getPosts(options: CursorPagination, whereConditions?: any): Promise<PostDTO[]> {
    const posts = await this.db.post.findMany({
      where: whereConditions || {},
      cursor: options.after ? { id: options.after } : (options.before) ? { id: options.before } : undefined,
      skip: options.after ?? options.before ? 1 : undefined,
      take: options.limit ? (options.before ? -options.limit : options.limit) : undefined,
      orderBy: [
        {
          createdAt: 'desc'
        },
        {
          id: 'asc'
        }
      ]
    })
    return posts.map(post => this.mapPostToDTO(post))
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const following = await this.db.follow.findMany({
      where: {
        followerId: userId,
        deletedAt: null
      },
      select: {
        followedId: true
      }
    })
    
    return following.map((follow: { followedId: string }) => follow.followedId)
  }

  async checkFollowRelationship(followerId: string, followedId: string): Promise<boolean> {
    const follow = await this.db.follow.findFirst({
      where: {
        followerId,
        followedId,
        deletedAt: null
      }
    })
    return !!follow
  }

  async getUserPrivacyStatus(userId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: {
        id: userId
      },
      select: {
        isPrivate: true
      }
    })
    return !!user?.isPrivate
  }

  async delete (postId: string): Promise<void> {
    await this.db.post.delete({
      where: {
        id: postId
      }
    })
  }

  async getById (postId: string): Promise<PostDTO | null> {
    const post = await this.db.post.findUnique({
      where: {
        id: postId
      }
    })
    return (post != null) ? this.mapPostToDTO(post) : null
  }

  async getPostsByAuthorId (authorId: string): Promise<PostDTO[]> {
    const posts = await this.db.post.findMany({
      where: {
        authorId
      }
    })
    return posts.map(post => this.mapPostToDTO(post))
  }
  
  async getCommentsByParentId(parentId: string): Promise<PostDTO[]> {
    const comments = await this.db.post.findMany({
      where: {
        parentId,
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return comments.map(post => this.mapPostToDTO(post))
  }
  
  async getCommentsByParentIdPaginated(parentId: string, options: CursorPagination): Promise<PostDTO[]> {
    const comments = await this.db.post.findMany({
      where: {
        parentId,
        deletedAt: null
      },
      cursor: options.after ? { id: options.after } : (options.before) ? { id: options.before } : undefined,
      skip: options.after ?? options.before ? 1 : undefined,
      take: options.limit ? (options.before ? -options.limit : options.limit) : undefined,
      orderBy: [
        {
          createdAt: 'desc'
        },
        {
          id: 'asc'
        }
      ]
    })
    
    return comments.map(post => this.mapPostToDTO(post))
  }
  
  async getCommentsByUserId(userId: string): Promise<PostDTO[]> {
    // Find posts that have a parentId (meaning they're comments) and were authored by userId
    const comments = await this.db.post.findMany({
      where: {
        authorId: userId,
        parentId: { not: null },
        deletedAt: null
      }
    })
    return comments.map(post => this.mapPostToDTO(post))
  }

  async updateImages(postId: string, images: string[]): Promise<PostDTO> {
    const post = await this.db.post.update({
      where: {
        id: postId
      },
      data: {
        images
      }
    })
    return this.mapPostToDTO(post)
  }
}
