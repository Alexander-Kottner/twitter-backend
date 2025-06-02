import { ExtendedUserDTO } from '../../../domains/user/dto';
export declare class PostImageDTO {
    constructor(image: PostImageDTO);
    id: string;
    postId: string;
    s3Key: string;
    index: number;
    createdAt: Date;
    url?: string | null;
}
export declare class CreatePostImageDTO {
    postId: string;
    s3Key: string;
    index: number;
}
export declare class CreatePostInputDTO {
    content: string;
    parentId?: string;
}
export declare class PostDTO {
    constructor(post: PostDTO);
    id: string;
    authorId: string;
    content: string;
    createdAt: Date;
    parentId?: string;
    likeCount: number;
    retweetCount: number;
    images: PostImageDTO[];
}
export declare class ExtendedPostDTO extends PostDTO {
    constructor(post: ExtendedPostDTO);
    author: ExtendedUserDTO;
    qtyComments: number;
    qtyLikes: number;
    qtyRetweets: number;
    hasLiked?: boolean;
    hasRetweeted?: boolean;
    comments?: ExtendedPostDTO[];
}
export declare class PostImageUploadDTO {
    postId: string;
    fileExt: string;
    index: number;
    constructor(postId: string, fileExt: string, index: number);
}
export declare class UpdatePostImagesDTO {
    postId: string;
    images: CreatePostImageDTO[];
    constructor(postId: string, images: CreatePostImageDTO[]);
}
