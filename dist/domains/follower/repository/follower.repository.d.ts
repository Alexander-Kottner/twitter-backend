import { FollowDTO } from '../dto';
export interface FollowerRepository {
    follow: (followerId: string, followedId: string) => Promise<FollowDTO>;
    unfollow: (followerId: string, followedId: string) => Promise<void>;
    isFollowing: (followerId: string, followedId: string) => Promise<boolean>;
}
