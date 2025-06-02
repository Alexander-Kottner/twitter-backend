export declare enum ChatRoomType {
    DM = "DM",
    GROUP = "GROUP"
}
export declare class CreateChatRoomDTO {
    name?: string;
    type: ChatRoomType;
    memberIds: string[];
    constructor(data: {
        name?: string;
        type: ChatRoomType;
        memberIds: string[];
    });
}
export declare class ChatRoomDTO {
    constructor(chatRoom: {
        id: string;
        name: string | null;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        members?: Array<{
            id: string;
            chatRoomId: string;
            userId: string;
            joinedAt: Date;
            lastReadAt: Date | null;
            user: {
                id: string;
                username: string;
                name: string | null;
                profilePicture: string | null;
            };
        }>;
    });
    id: string;
    name?: string;
    type: ChatRoomType;
    createdAt: Date;
    updatedAt: Date;
    members?: Array<{
        id: string;
        chatRoomId: string;
        userId: string;
        joinedAt: Date;
        lastReadAt: Date | null;
        user: {
            id: string;
            username: string;
            name: string | null;
            profilePicture: string | null;
        };
    }>;
}
export declare class ChatRoomSummaryDTO {
    constructor(data: ChatRoomSummaryDTO);
    id: string;
    name?: string;
    type: ChatRoomType;
    memberCount: number;
    lastMessage?: {
        content: string;
        createdAt: Date;
        authorName: string;
    };
    unreadCount: number;
}
export declare class UpdateChatRoomDTO {
    name?: string;
    constructor(data: {
        name?: string;
    });
}
