export declare enum ReactionType {
    LIKE = "LIKE",
    RETWEET = "RETWEET"
}
export declare class CreateReactionDTO {
    postId: string;
    type: ReactionType;
}
export declare class ReactionDTO {
    constructor(reaction: ReactionDTO);
    id: string;
    userId: string;
    postId: string;
    type: ReactionType;
    createdAt: Date;
}
