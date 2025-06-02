export declare class AddMemberToChatRoomDTO {
    chatRoomId: string;
    userId: string;
    constructor(data: {
        chatRoomId: string;
        userId: string;
    });
}
export declare class ChatRoomMemberDTO {
    constructor(member: {
        id: string;
        chatRoomId: string;
        userId: string;
        joinedAt: Date;
        lastReadAt: Date | null;
        user?: {
            id: string;
            username: string;
            name: string | null;
            profilePicture: string | null;
        };
        chatRoom?: any;
    });
    id: string;
    chatRoomId: string;
    userId: string;
    joinedAt: Date;
    lastReadAt?: Date;
    user?: {
        id: string;
        username: string;
        name?: string;
        profilePicture?: string;
    };
    chatRoom?: any;
}
export declare class RemoveMemberFromChatRoomDTO {
    chatRoomId: string;
    userId: string;
    constructor(data: {
        chatRoomId: string;
        userId: string;
    });
}
export declare class UpdateLastReadDTO {
    chatRoomId: string;
    userId: string;
    lastReadAt: Date;
    constructor(data: {
        chatRoomId: string;
        userId: string;
        lastReadAt: Date;
    });
}
