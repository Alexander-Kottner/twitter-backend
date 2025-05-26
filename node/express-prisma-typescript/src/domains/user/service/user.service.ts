import { OffsetPagination } from '@types'
import { UserDTO, UserViewDTO } from '../dto'

export interface UserService {
  deleteUser: (userId: any) => Promise<void>
  getUser: (userId: any, currentUserId?: string) => Promise<UserViewDTO>
  getUserRecommendations: (userId: any, options: OffsetPagination) => Promise<UserViewDTO[]>
  updatePrivacy: (userId: string, isPrivate: boolean) => Promise<UserDTO>
  updateProfilePicture: (userId: string, profilePicture: string) => Promise<UserDTO>
  generateProfilePictureUploadUrl: (userId: string, fileExt: string) => Promise<{ uploadUrl: string, key: string }>
  getUsersByUsername: (username: string, options: OffsetPagination, currentUserId?: string) => Promise<UserViewDTO[]>
}
