import { PrismaClient } from '@prisma/client';
import { ReactionDTO, ReactionType } from '../dto';
import { ReactionRepository } from './reaction.repository';
export declare class ReactionRepositoryImpl implements ReactionRepository {
    private db;
    constructor(db: PrismaClient);
    create(userId: string, postId: string, type: ReactionType): Promise<ReactionDTO>;
    delete(userId: string, postId: string, type: ReactionType): Promise<void>;
    getByPostIdAndUserId(postId: string, userId: string, type: ReactionType): Promise<ReactionDTO | null>;
    getCountByPostId(postId: string, type: ReactionType): Promise<number>;
    getByUserId(userId: string, type: ReactionType): Promise<ReactionDTO[]>;
    syncReactionCounts(postId: string): Promise<void>;
    getAllPostIds(): Promise<string[]>;
}
