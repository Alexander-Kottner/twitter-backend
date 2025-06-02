export declare enum MessageType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    FILE = "FILE"
}
export declare class CreateMessageDTO {
    chatRoomId: string;
    authorId: string;
    content: string;
    type?: MessageType;
    iv?: string;
    tag?: string;
    isEncrypted?: boolean;
    constructor(data: {
        chatRoomId: string;
        authorId: string;
        content: string;
        type?: MessageType;
        iv?: string;
        tag?: string;
        isEncrypted?: boolean;
    });
}
export declare class MessageDTO {
    constructor(message: {
        id: string;
        chatRoomId: string;
        authorId: string;
        content: string;
        type: string;
        isEncrypted?: boolean;
        iv?: string | null;
        tag?: string | null;
        createdAt: Date;
        updatedAt: Date;
        author?: {
            id: string;
            username: string;
            name: string | null;
            profilePicture: string | null;
        };
    });
    id: string;
    chatRoomId: string;
    authorId: string;
    content: string;
    type: MessageType;
    isEncrypted: boolean;
    iv?: string;
    tag?: string;
    createdAt: Date;
    updatedAt: Date;
    author?: {
        id: string;
        username: string;
        name?: string;
        profilePicture?: string;
    };
}
export declare class MessageResponseDTO {
    constructor(data: MessageResponseDTO);
    message: MessageDTO;
    chatRoom: {
        id: string;
        name?: string;
        type: string;
    };
}
export declare class GetMessagesDTO {
    chatRoomId: string;
    limit?: number;
    cursor?: string;
    constructor(data: {
        chatRoomId: string;
        limit?: number;
        cursor?: string;
    });
}
