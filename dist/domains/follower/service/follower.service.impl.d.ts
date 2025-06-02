import { FollowDTO } from '../dto';
import { FollowerRepository } from '../repository';
import { FollowerService } from './follower.service';
export declare class FollowerServiceImpl implements FollowerService {
    private readonly repository;
    constructor(repository: FollowerRepository);
    followUser(followerId: string, followedId: string): Promise<FollowDTO>;
    unfollowUser(followerId: string, followedId: string): Promise<void>;
}
