import { ChatRoomMemberRepository } from '../repository/chat-room-member.repository';
import { ChatRoomRepository } from '../repository/chat-room.repository';
import { AddMemberToChatRoomDTO, ChatRoomMemberDTO, UpdateLastReadDTO } from '../dto/chat-room-member.dto';
export declare class ChatRoomMemberService {
    private readonly chatRoomMemberRepository;
    private readonly chatRoomRepository;
    constructor(chatRoomMemberRepository: ChatRoomMemberRepository, chatRoomRepository: ChatRoomRepository);
    addMemberToChatRoom(data: AddMemberToChatRoomDTO, requesterId: string): Promise<ChatRoomMemberDTO>;
    removeMemberFromChatRoom(chatRoomId: string, userId: string, requesterId: string): Promise<void>;
    getChatRoomMembers(chatRoomId: string, requesterId: string): Promise<ChatRoomMemberDTO[]>;
    updateLastRead(data: UpdateLastReadDTO): Promise<ChatRoomMemberDTO>;
    leaveChatRoom(chatRoomId: string, userId: string): Promise<void>;
    private validateChatRoomExists;
    private validateMembership;
}
