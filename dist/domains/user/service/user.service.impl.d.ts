import { OffsetPagination } from '../../../types';
import { UserDTO, UserViewDTO } from '../dto';
import { UserRepository } from '../repository';
import { UserService } from './user.service';
import { FollowerRepository } from '../../../domains/follower/repository';
export declare class UserServiceImpl implements UserService {
    private readonly repository;
    private readonly followerRepository?;
    constructor(repository: UserRepository, followerRepository?: FollowerRepository | undefined);
    getUser(userId: any, currentUserId?: string): Promise<UserViewDTO>;
    getUserRecommendations(userId: any, options: OffsetPagination): Promise<UserViewDTO[]>;
    getUsersByUsername(username: string, options: OffsetPagination, currentUserId?: string): Promise<UserViewDTO[]>;
    deleteUser(userId: any): Promise<void>;
    updatePrivacy(userId: string, isPrivate: boolean): Promise<UserDTO>;
    updateProfilePicture(userId: string, profilePicture: string): Promise<UserDTO>;
    generateProfilePictureUploadUrl(userId: string, fileExt: string): Promise<{
        uploadUrl: string;
        key: string;
    }>;
    private getContentTypeFromFileExt;
}
