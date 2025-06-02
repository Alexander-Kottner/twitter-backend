import { SignupInputDTO } from '../../../domains/auth/dto';
import { PrismaClient } from '@prisma/client';
import { OffsetPagination } from '../../../types';
import { ExtendedUserDTO, UserDTO } from '../dto';
import { UserRepository } from './user.repository';
export declare class UserRepositoryImpl implements UserRepository {
    private readonly db;
    constructor(db: PrismaClient);
    create(data: SignupInputDTO): Promise<UserDTO>;
    getById(userId: string): Promise<ExtendedUserDTO | null>;
    delete(userId: string): Promise<void>;
    getRecommendedUsersPaginated(options: OffsetPagination): Promise<ExtendedUserDTO[]>;
    getByEmailOrUsername(email?: string, username?: string): Promise<ExtendedUserDTO | null>;
    updatePrivacy(userId: string, isPrivate: boolean): Promise<UserDTO>;
    updateProfilePicture(userId: string, profilePicture: string): Promise<UserDTO>;
    getUsersByUsername(username: string, options: OffsetPagination): Promise<ExtendedUserDTO[]>;
}
