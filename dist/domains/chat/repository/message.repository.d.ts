import { CreateMessageDTO, MessageDTO } from '../dto/message.dto';
export interface MessageRepository {
    create: (data: CreateMessageDTO) => Promise<MessageDTO>;
    findById: (id: string) => Promise<MessageDTO | null>;
    findByChatRoomId: (chatRoomId: string, limit?: number, cursor?: string) => Promise<MessageDTO[]>;
    update: (id: string, updateData: string | {
        content: string;
        iv?: string;
        tag?: string;
        isEncrypted?: boolean;
    }) => Promise<MessageDTO>;
    delete: (id: string) => Promise<void>;
    getLastMessageForChatRoom: (chatRoomId: string) => Promise<MessageDTO | null>;
    getMessageCountAfterTimestamp: (chatRoomId: string, timestamp: Date) => Promise<number>;
}
