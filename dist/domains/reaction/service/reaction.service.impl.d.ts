import { ReactionDTO, ReactionType } from '../dto';
import { ReactionRepository } from '../repository';
import { ReactionService } from './reaction.service';
export declare class ReactionServiceImpl implements ReactionService {
    private repository;
    constructor(repository: ReactionRepository);
    createReaction(userId: string, postId: string, type: ReactionType): Promise<ReactionDTO>;
    deleteReaction(userId: string, postId: string, type: ReactionType): Promise<void>;
    getReactionCountsForPost(postId: string): Promise<{
        likes: number;
        retweets: number;
    }>;
    hasUserReacted(userId: string, postId: string, type: ReactionType): Promise<boolean>;
    getUserReactions(userId: string, type: ReactionType): Promise<ReactionDTO[]>;
    syncAllReactionCounts(): Promise<void>;
}
