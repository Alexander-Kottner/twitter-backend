import { SignupInputDTO } from '@domains/auth/dto'
import { PrismaClient } from '@prisma/client'
import { OffsetPagination } from '@types'
import { ExtendedUserDTO, UserDTO } from '../dto'
import { UserRepository } from './user.repository'

// Define a type that matches the structure of a User from Prisma
type User = {
  id: string;
  username: string;
  name: string | null;
  email: string;
  password: string;
  isPrivate: boolean;
  profilePicture: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class UserRepositoryImpl implements UserRepository {
  constructor (private readonly db: PrismaClient) {}

  async create (data: SignupInputDTO): Promise<UserDTO> {
    return await this.db.user.create({
      data
    }).then((user: User) => new UserDTO(user))
  }

  async getById (userId: string): Promise<ExtendedUserDTO | null> {
    const user = await this.db.user.findUnique({
      where: {
        id: userId
      }
    })
    return user ? new ExtendedUserDTO(user) : null
  }

  async delete (userId: string): Promise<void> {
    await this.db.user.delete({
      where: {
        id: userId
      }
    })
  }

  async getRecommendedUsersPaginated (options: OffsetPagination): Promise<ExtendedUserDTO[]> {
    const users = await this.db.user.findMany({
      take: options.limit ? options.limit : undefined,
      skip: options.skip ? options.skip : undefined,
      orderBy: [
        {
          id: 'asc'
        }
      ]
    })
    return users.map((user: User) => new ExtendedUserDTO(user))
  }

  async getByEmailOrUsername (email?: string, username?: string): Promise<ExtendedUserDTO | null> {
    const user = await this.db.user.findFirst({
      where: {
        OR: [
          {
            email
          },
          {
            username
          }
        ]
      }
    })
    return user ? new ExtendedUserDTO(user) : null
  }

  async updatePrivacy (userId: string, isPrivate: boolean): Promise<UserDTO> {
    const user = await this.db.user.update({
      where: {
        id: userId
      },
      data: {
        isPrivate
      }
    })
    return new UserDTO(user)
  }

  async updateProfilePicture (userId: string, profilePicture: string): Promise<UserDTO> {
    const user = await this.db.user.update({
      where: {
        id: userId
      },
      data: {
        profilePicture
      }
    })
    return new UserDTO(user)
  }

  async getUsersByUsername (username: string, options: OffsetPagination): Promise<ExtendedUserDTO[]> {
    const users = await this.db.user.findMany({
      where: {
        username: {
          contains: username,
          mode: 'insensitive'
        }
      },
      take: options.limit ? options.limit : undefined,
      skip: options.skip ? options.skip : undefined,
      orderBy: {
        username: 'asc'
      }
    })
    return users.map((user: User) => new ExtendedUserDTO(user))
  }
}
