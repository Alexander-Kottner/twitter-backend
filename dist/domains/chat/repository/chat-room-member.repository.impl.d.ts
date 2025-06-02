import { PrismaClient } from '@prisma/client';
import { AddMemberToChatRoomDTO, UpdateLastReadDTO, ChatRoomMemberDTO } from '../dto/chat-room-member.dto';
import { ChatRoomMemberRepository } from './chat-room-member.repository';
export declare class ChatRoomMemberRepositoryImpl implements ChatRoomMemberRepository {
    private readonly db;
    constructor(db: PrismaClient);
    addMember(data: AddMemberToChatRoomDTO): Promise<ChatRoomMemberDTO>;
    removeMember(chatRoomId: string, userId: string): Promise<void>;
    findByChatRoomId(chatRoomId: string): Promise<ChatRoomMemberDTO[]>;
    findByUserId(userId: string): Promise<ChatRoomMemberDTO[]>;
    isMember(chatRoomId: string, userId: string): Promise<boolean>;
    updateLastRead(data: UpdateLastReadDTO): Promise<ChatRoomMemberDTO>;
    getMemberCount(chatRoomId: string): Promise<number>;
}
