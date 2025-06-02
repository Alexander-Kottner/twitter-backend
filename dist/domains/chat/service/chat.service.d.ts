import { ChatRoomService } from './chat-room.service';
import { ChatRoomMemberService } from './chat-room-member.service';
import { MessageService } from './message.service';
import { FollowerRepository } from '../../../domains/follower/repository/follower.repository';
import { CreateMessageDTO, MessageResponseDTO } from '../dto/message.dto';
import { CreateChatRoomDTO, ChatRoomDTO, ChatRoomSummaryDTO } from '../dto/chat-room.dto';
import { ChatRoomMemberDTO } from '../dto/chat-room-member.dto';
export declare class ChatService {
    private readonly chatRoomService;
    private readonly chatRoomMemberService;
    private readonly messageService;
    private readonly followerRepository;
    constructor(chatRoomService: ChatRoomService, chatRoomMemberService: ChatRoomMemberService, messageService: MessageService, followerRepository: FollowerRepository);
    createChatRoom(data: CreateChatRoomDTO, requesterId: string): Promise<ChatRoomDTO>;
    findOrCreateDMChatRoom(user1Id: string, user2Id: string): Promise<ChatRoomDTO>;
    getUserChatRooms(userId: string): Promise<ChatRoomSummaryDTO[]>;
    sendMessage(data: CreateMessageDTO): Promise<MessageResponseDTO>;
    getChatRoomMessages(chatRoomId: string, userId: string, limit?: number, cursor?: string): Promise<any[]>;
    getChatRoomMembers(chatRoomId: string, userId?: string): Promise<ChatRoomMemberDTO[]>;
    validateChatRoomMembership(chatRoomId: string, userId: string): Promise<boolean>;
    getUnreadCount(chatRoomId: string, userId: string): Promise<number>;
    updateLastRead(chatRoomId: string, userId: string): Promise<void>;
    private validateMutualFollow;
    private validateMutualFollowsForGroup;
    private createUpdatedChatRoomService;
}
