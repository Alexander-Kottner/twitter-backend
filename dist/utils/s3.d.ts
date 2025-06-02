export declare const generateUploadUrl: (key: string, contentType: string) => Promise<string>;
export declare const generateDownloadUrl: (key: string) => Promise<string>;
export declare const getPublicUrl: (key: string) => string;
export declare const generateProfilePictureKey: (userId: string, fileExt: string) => string;
export declare const generatePostPictureKey: (postId: string, index: number, fileExt: string) => string;
export declare const hasAccessToPostImage: (viewerId: string, authorId: string, isPrivate: boolean, isFollowing: boolean) => boolean;
export declare const getPostImageUrl: (key: string, viewerId: string, authorId: string, isPrivate: boolean, isFollowing: boolean) => Promise<string | null>;
export declare const getProfilePictureUrl: (key: string) => string;
