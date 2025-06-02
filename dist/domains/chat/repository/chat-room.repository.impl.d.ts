import { PrismaClient } from '@prisma/client';
import { CreateChatRoomDTO, UpdateChatRoomDTO, ChatRoomDTO } from '../dto/chat-room.dto';
import { ChatRoomRepository } from './chat-room.repository';
export declare class ChatRoomRepositoryImpl implements ChatRoomRepository {
    private readonly db;
    constructor(db: PrismaClient);
    create(data: CreateChatRoomDTO): Promise<ChatRoomDTO>;
    findById(id: string): Promise<ChatRoomDTO | null>;
    findByUserId(userId: string): Promise<ChatRoomDTO[]>;
    findDMByUserIds(userId1: string, userId2: string): Promise<ChatRoomDTO | null>;
    findByMemberId(userId: string): Promise<ChatRoomDTO[]>;
    findDMBetweenUsers(user1Id: string, user2Id: string): Promise<ChatRoomDTO | null>;
    update(id: string, data: UpdateChatRoomDTO): Promise<ChatRoomDTO>;
    delete(id: string): Promise<void>;
    getUnreadCountForUser(chatRoomId: string, userId: string): Promise<number>;
    findOrCreateDMTransaction(user1Id: string, user2Id: string): Promise<ChatRoomDTO>;
    createWithTransaction(data: CreateChatRoomDTO): Promise<ChatRoomDTO>;
}
