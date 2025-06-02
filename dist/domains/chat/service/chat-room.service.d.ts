import { ChatRoomRepository } from '../repository/chat-room.repository';
import { ChatRoomMemberRepository } from '../repository/chat-room-member.repository';
import { MessageRepository } from '../repository/message.repository';
import { FollowerRepository } from '../../../domains/follower/repository/follower.repository';
import { CreateChatRoomDTO, ChatRoomDTO, ChatRoomSummaryDTO, UpdateChatRoomDTO } from '../dto/chat-room.dto';
export declare class ChatRoomService {
    private readonly chatRoomRepository;
    private readonly chatRoomMemberRepository;
    private readonly messageRepository;
    private readonly followerRepository;
    private followerServiceCircuitBreaker;
    private readonly circuitBreakerTimeout;
    private readonly failureThreshold;
    constructor(chatRoomRepository: ChatRoomRepository, chatRoomMemberRepository: ChatRoomMemberRepository, messageRepository: MessageRepository, followerRepository: FollowerRepository);
    createChatRoom(data: CreateChatRoomDTO, requesterId: string): Promise<ChatRoomDTO>;
    getChatRoom(id: string, userId: string): Promise<ChatRoomDTO | null>;
    getUserChatRooms(userId: string): Promise<ChatRoomSummaryDTO[]>;
    findOrCreateDMChatRoom(user1Id: string, user2Id: string): Promise<ChatRoomDTO>;
    updateChatRoom(id: string, data: UpdateChatRoomDTO, userId: string): Promise<ChatRoomDTO>;
    deleteChatRoom(id: string, userId: string): Promise<void>;
    getUnreadCountForUser(chatRoomId: string, userId: string): Promise<number>;
    private validateMembership;
    private validateMutualFollow;
    private validateMutualFollowsForGroupOptimized;
    private isCircuitBreakerOpen;
    private recordFailure;
    private resetCircuitBreaker;
}
