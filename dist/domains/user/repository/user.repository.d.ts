import { SignupInputDTO } from '../../../domains/auth/dto';
import { OffsetPagination } from '../../../types';
import { ExtendedUserDTO, UserDTO } from '../dto';
export interface UserRepository {
    create: (data: SignupInputDTO) => Promise<UserDTO>;
    delete: (userId: string) => Promise<void>;
    getRecommendedUsersPaginated: (options: OffsetPagination) => Promise<ExtendedUserDTO[]>;
    getById: (userId: string) => Promise<ExtendedUserDTO | null>;
    getByEmailOrUsername: (email?: string, username?: string) => Promise<ExtendedUserDTO | null>;
    updatePrivacy: (userId: string, isPrivate: boolean) => Promise<UserDTO>;
    updateProfilePicture: (userId: string, profilePicture: string) => Promise<UserDTO>;
    getUsersByUsername: (username: string, options: OffsetPagination) => Promise<ExtendedUserDTO[]>;
}
