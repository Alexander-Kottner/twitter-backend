import { PrismaClient } from '@prisma/client';
import { FollowDTO } from '../dto';
import { FollowerRepository } from './follower.repository';
export declare class FollowerRepositoryImpl implements FollowerRepository {
    private readonly db;
    constructor(db: PrismaClient);
    follow(followerId: string, followedId: string): Promise<FollowDTO>;
    unfollow(followerId: string, followedId: string): Promise<void>;
    isFollowing(followerId: string, followedId: string): Promise<boolean>;
}
