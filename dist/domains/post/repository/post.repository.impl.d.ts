import { PrismaClient } from '@prisma/client';
import { CursorPagination } from '../../../types';
import { PostRepository } from '.';
import { CreatePostImageDTO, CreatePostInputDTO, PostDTO, PostImageDTO } from '../dto';
export declare class PostRepositoryImpl implements PostRepository {
    private readonly db;
    constructor(db: PrismaClient);
    create(userId: string, data: CreatePostInputDTO): Promise<PostDTO>;
    private mapPostToDTO;
    private mapPostImageToDTO;
    getPosts(options: CursorPagination, whereConditions?: any): Promise<PostDTO[]>;
    getFollowingIds(userId: string): Promise<string[]>;
    checkFollowRelationship(followerId: string, followedId: string): Promise<boolean>;
    getUserPrivacyStatus(userId: string): Promise<boolean>;
    delete(postId: string): Promise<void>;
    getById(postId: string): Promise<PostDTO | null>;
    getPostsByAuthorId(authorId: string): Promise<PostDTO[]>;
    getCommentsByParentId(parentId: string): Promise<PostDTO[]>;
    getCommentsByParentIdPaginated(parentId: string, options: CursorPagination): Promise<PostDTO[]>;
    getCommentsByUserId(userId: string): Promise<PostDTO[]>;
    createPostImage(data: CreatePostImageDTO): Promise<PostImageDTO>;
    getPostImagesByPostId(postId: string): Promise<PostImageDTO[]>;
    deletePostImage(imageId: string): Promise<void>;
    deletePostImagesByPostId(postId: string): Promise<void>;
    updatePostImage(imageId: string, s3Key: string): Promise<PostImageDTO>;
}
