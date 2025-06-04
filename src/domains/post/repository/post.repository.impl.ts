import { PrismaClient } from '@prisma/client'

import { CursorPagination } from '@types'

import { PostRepository } from '.'
import { CreatePostImageDTO, CreatePostInputDTO, PostDTO, PostImageDTO } from '../dto'

// Define a type that matches the actual Prisma Post schema
type PrismaPost = {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  parentId?: string | null;
  likeCount: number;
  retweetCount: number;
}

// Define a type that matches the actual Prisma PostImage schema
type PrismaPostImage = {
  id: string;
  postId: string;
  s3Key: string;
  index: number;
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
        content: data.content,
        parentId: data.parentId
      },
      include: {
        images: true
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
      createdAt: post.createdAt,
      parentId: post.parentId,
      likeCount: post.likeCount ?? 0,
      retweetCount: post.retweetCount ?? 0,
      images: Array.isArray(post.images) 
        ? post.images.map((image: any) => this.mapPostImageToDTO(image))
        : []
    });
  }

  // Helper method to convert Prisma PostImage to PostImageDTO
  private mapPostImageToDTO(image: any): PostImageDTO {
    return new PostImageDTO({
      id: image.id,
      postId: image.postId,
      s3Key: image.s3Key,
      index: image.index,
      createdAt: image.createdAt
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
      ],
      include: {
        images: {
          orderBy: {
            index: 'asc'
          }
        }
      }
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
    // When a post is deleted, all associated images will be deleted automatically due to the CASCADE constraint
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
      },
      include: {
        images: {
          orderBy: {
            index: 'asc'
          }
        }
      }
    })
    return (post != null) ? this.mapPostToDTO(post) : null
  }

  async getPostsByAuthorId (authorId: string): Promise<PostDTO[]> {
    const posts = await this.db.post.findMany({
      where: {
        authorId
      },
      include: {
        images: {
          orderBy: {
            index: 'asc'
          }
        }
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
      },
      include: {
        images: {
          orderBy: {
            index: 'asc'
          }
        }
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
      ],
      include: {
        images: {
          orderBy: {
            index: 'asc'
          }
        }
      }
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
      },
      include: {
        images: {
          orderBy: {
            index: 'asc'
          }
        }
      }
    })
    return comments.map(post => this.mapPostToDTO(post))
  }

  async createPostImage(data: CreatePostImageDTO): Promise<PostImageDTO> {
    const image = await this.db.postImage.create({
      data: {
        postId: data.postId,
        s3Key: data.s3Key,
        index: data.index
      }
    })
    
    return this.mapPostImageToDTO(image)
  }

  async getPostImagesByPostId(postId: string): Promise<PostImageDTO[]> {
    const images = await this.db.postImage.findMany({
      where: {
        postId,
        deletedAt: null
      },
      orderBy: {
        index: 'asc'
      }
    })
    
    return images.map(image => this.mapPostImageToDTO(image))
  }

  async deletePostImage(imageId: string): Promise<void> {
    await this.db.postImage.delete({
      where: {
        id: imageId
      }
    })
  }

  async deletePostImagesByPostId(postId: string): Promise<void> {
    await this.db.postImage.deleteMany({
      where: {
        postId
      }
    })
  }

  async updatePostImage(imageId: string, s3Key: string): Promise<PostImageDTO> {
    const image = await this.db.postImage.update({
      where: {
        id: imageId
      },
      data: {
        s3Key
      }
    })
    
    return this.mapPostImageToDTO(image)
  }

  async getCommentsByParentIdPaginatedSortedByReactions(parentId: string, options: CursorPagination): Promise<PostDTO[]> {
    // For cursor pagination with custom sorting, we need to handle the cursor logic differently
    // Since we're sorting by reactions (likeCount + retweetCount), we need to use a compound cursor
    
    let whereClause: any = {
      parentId,
      deletedAt: null
    }

    // Handle cursor pagination with reaction-based sorting
    if (options.after || options.before) {
      // We need to get the reference post to understand the cursor position
      const cursorId = options.after || options.before
      const cursorPost = await this.db.post.findUnique({
        where: { id: cursorId },
        select: { 
          id: true, 
          likeCount: true, 
          retweetCount: true,
          createdAt: true
        }
      })

      if (cursorPost) {
        const cursorTotalReactions = (cursorPost.likeCount || 0) + (cursorPost.retweetCount || 0)
        
        if (options.after) {
          // Get posts with fewer reactions than cursor, or same reactions but later creation date
          whereClause = {
            ...whereClause,
            OR: [
              {
                // Posts with fewer total reactions
                AND: [
                  {
                    OR: [
                      { likeCount: { lt: cursorTotalReactions } },
                      {
                        AND: [
                          { likeCount: cursorPost.likeCount },
                          { retweetCount: { lt: cursorPost.retweetCount } }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                // Posts with same total reactions but created after cursor post
                AND: [
                  { likeCount: cursorPost.likeCount },
                  { retweetCount: cursorPost.retweetCount },
                  { createdAt: { gt: cursorPost.createdAt } }
                ]
              },
              {
                // Posts with same total reactions and same creation time but different ID (for consistency)
                AND: [
                  { likeCount: cursorPost.likeCount },
                  { retweetCount: cursorPost.retweetCount },
                  { createdAt: cursorPost.createdAt },
                  { id: { gt: cursorPost.id } }
                ]
              }
            ]
          }
        } else if (options.before) {
          // Get posts with more reactions than cursor, or same reactions but earlier creation date
          whereClause = {
            ...whereClause,
            OR: [
              {
                // Posts with more total reactions
                AND: [
                  {
                    OR: [
                      { likeCount: { gt: cursorTotalReactions } },
                      {
                        AND: [
                          { likeCount: cursorPost.likeCount },
                          { retweetCount: { gt: cursorPost.retweetCount } }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                // Posts with same total reactions but created before cursor post
                AND: [
                  { likeCount: cursorPost.likeCount },
                  { retweetCount: cursorPost.retweetCount },
                  { createdAt: { lt: cursorPost.createdAt } }
                ]
              },
              {
                // Posts with same total reactions and same creation time but different ID (for consistency)
                AND: [
                  { likeCount: cursorPost.likeCount },
                  { retweetCount: cursorPost.retweetCount },
                  { createdAt: cursorPost.createdAt },
                  { id: { lt: cursorPost.id } }
                ]
              }
            ]
          }
        }
      }
    }

    const comments = await this.db.post.findMany({
      where: whereClause,
      take: options.limit || undefined,
      orderBy: [
        // Primary sort: by total reactions (desc) - we'll handle this with a raw query approach
        { likeCount: 'desc' },
        { retweetCount: 'desc' },
        // Secondary sort: by creation date (desc) for posts with same reaction count
        { createdAt: 'desc' },
        // Tertiary sort: by ID for complete consistency
        { id: 'asc' }
      ],
      include: {
        images: {
          orderBy: {
            index: 'asc'
          }
        }
      }
    })

    // Since Prisma doesn't support computed column sorting directly, we need to sort by total reactions
    const sortedComments = comments.sort((a, b) => {
      const totalReactionsA = (a.likeCount || 0) + (a.retweetCount || 0)
      const totalReactionsB = (b.likeCount || 0) + (b.retweetCount || 0)
      
      // Primary sort: by total reactions (descending)
      if (totalReactionsA !== totalReactionsB) {
        return totalReactionsB - totalReactionsA
      }
      
      // Secondary sort: by creation date (descending)
      if (a.createdAt.getTime() !== b.createdAt.getTime()) {
        return b.createdAt.getTime() - a.createdAt.getTime()
      }
      
      // Tertiary sort: by ID (ascending) for consistency
      return a.id.localeCompare(b.id)
    })

    // Apply limit after sorting if we had to do in-memory sorting
    const finalComments = options.limit ? sortedComments.slice(0, options.limit) : sortedComments

    return finalComments.map(post => this.mapPostToDTO(post))
  }
}
