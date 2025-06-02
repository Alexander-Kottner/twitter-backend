import { PrismaClient } from '@prisma/client';
import { CreateMessageDTO, MessageDTO } from '../dto/message.dto';
import { MessageRepository } from './message.repository';
export declare class MessageRepositoryImpl implements MessageRepository {
    private readonly db;
    constructor(db: PrismaClient);
    create(data: CreateMessageDTO): Promise<MessageDTO>;
    findById(id: string): Promise<MessageDTO | null>;
    findByChatRoomId(chatRoomId: string, limit?: number, cursor?: string): Promise<MessageDTO[]>;
    update(id: string, updateData: string | {
        content: string;
        iv?: string;
        tag?: string;
        isEncrypted?: boolean;
    }): Promise<MessageDTO>;
    delete(id: string): Promise<void>;
    getLastMessageForChatRoom(chatRoomId: string): Promise<MessageDTO | null>;
    getMessageCountAfterTimestamp(chatRoomId: string, timestamp: Date): Promise<number>;
}
