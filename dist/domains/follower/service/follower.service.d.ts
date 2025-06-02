import { FollowDTO } from '../dto';
export interface FollowerService {
    followUser: (followerId: string, followedId: string) => Promise<FollowDTO>;
    unfollowUser: (followerId: string, followedId: string) => Promise<void>;
}
