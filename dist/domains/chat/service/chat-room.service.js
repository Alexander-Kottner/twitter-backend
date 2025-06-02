"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRoomService = void 0;
const chat_room_dto_1 = require("../dto/chat-room.dto");
const errors_dto_1 = require("../dto/errors.dto");
class ChatRoomService {
    chatRoomRepository;
    chatRoomMemberRepository;
    messageRepository;
    followerRepository;
    followerServiceCircuitBreaker = {
        failureCount: 0,
        lastFailureTime: 0,
        state: 'CLOSED'
    };
    circuitBreakerTimeout = 60000;
    failureThreshold = 5;
    constructor(chatRoomRepository, chatRoomMemberRepository, messageRepository, followerRepository) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.messageRepository = messageRepository;
        this.followerRepository = followerRepository;
    }
    async createChatRoom(data, requesterId) {
        if (!data.memberIds.includes(requesterId)) {
            throw new errors_dto_1.ValidationError('Requester must be included in the chat room members');
        }
        if (data.type === chat_room_dto_1.ChatRoomType.DM && data.memberIds.length !== 2) {
            throw new errors_dto_1.ValidationError('DM chats must have exactly 2 members');
        }
        await this.validateMutualFollowsForGroupOptimized(data.memberIds);
        return await this.chatRoomRepository.createWithTransaction(data);
    }
    async getChatRoom(id, userId) {
        await this.validateMembership(id, userId);
        return await this.chatRoomRepository.findById(id);
    }
    async getUserChatRooms(userId) {
        const chatRooms = await this.chatRoomRepository.findByMemberId(userId);
        const summaries = [];
        for (const room of chatRooms) {
            const memberCount = await this.chatRoomMemberRepository.getMemberCount(room.id);
            const lastMessage = await this.messageRepository.getLastMessageForChatRoom(room.id);
            const unreadCount = await this.chatRoomRepository.getUnreadCountForUser(room.id, userId);
            summaries.push(new chat_room_dto_1.ChatRoomSummaryDTO({
                id: room.id,
                name: room.name,
                type: room.type,
                memberCount,
                lastMessage: lastMessage ? {
                    content: lastMessage.content,
                    createdAt: lastMessage.createdAt,
                    authorName: lastMessage.authorId
                } : undefined,
                unreadCount
            }));
        }
        return summaries;
    }
    async findOrCreateDMChatRoom(user1Id, user2Id) {
        await this.validateMutualFollow(user1Id, user2Id);
        return await this.chatRoomRepository.findOrCreateDMTransaction(user1Id, user2Id);
    }
    async updateChatRoom(id, data, userId) {
        await this.validateMembership(id, userId);
        return await this.chatRoomRepository.update(id, data);
    }
    async deleteChatRoom(id, userId) {
        await this.validateMembership(id, userId);
        await this.chatRoomRepository.delete(id);
    }
    async getUnreadCountForUser(chatRoomId, userId) {
        return await this.chatRoomRepository.getUnreadCountForUser(chatRoomId, userId);
    }
    async validateMembership(chatRoomId, userId) {
        const isMember = await this.chatRoomMemberRepository.isMember(chatRoomId, userId);
        if (!isMember) {
            throw new errors_dto_1.AuthorizationError('User is not a member of this chat room');
        }
    }
    async validateMutualFollow(user1Id, user2Id) {
        try {
            if (this.isCircuitBreakerOpen()) {
                throw new Error('Follower service temporarily unavailable');
            }
            const user1FollowsUser2 = await this.followerRepository.isFollowing(user1Id, user2Id);
            const user2FollowsUser1 = await this.followerRepository.isFollowing(user2Id, user1Id);
            if (!user1FollowsUser2 || !user2FollowsUser1) {
                throw new errors_dto_1.AuthorizationError('Users must follow each other to chat');
            }
            this.resetCircuitBreaker();
        }
        catch (error) {
            this.recordFailure();
            if (this.isCircuitBreakerOpen()) {
                console.warn(`Follower service unavailable, allowing chat between ${user1Id} and ${user2Id}`);
                return;
            }
            throw error;
        }
    }
    async validateMutualFollowsForGroupOptimized(memberIds) {
        try {
            if (this.isCircuitBreakerOpen()) {
                console.warn('Follower service unavailable, skipping mutual follow validation');
                return;
            }
            const followChecks = [];
            const pairs = [];
            for (let i = 0; i < memberIds.length; i++) {
                for (let j = i + 1; j < memberIds.length; j++) {
                    pairs.push([memberIds[i], memberIds[j]]);
                    followChecks.push(this.followerRepository.isFollowing(memberIds[i], memberIds[j]));
                    followChecks.push(this.followerRepository.isFollowing(memberIds[j], memberIds[i]));
                }
            }
            const results = await Promise.all(followChecks);
            for (let i = 0; i < results.length; i += 2) {
                const user1FollowsUser2 = results[i];
                const user2FollowsUser1 = results[i + 1];
                if (!user1FollowsUser2 || !user2FollowsUser1) {
                    const [user1Id, user2Id] = pairs[Math.floor(i / 2)];
                    throw new errors_dto_1.AuthorizationError(`Users ${user1Id} and ${user2Id} must follow each other to be in the same group`);
                }
            }
            this.resetCircuitBreaker();
        }
        catch (error) {
            this.recordFailure();
            if (this.isCircuitBreakerOpen()) {
                console.warn('Follower service unavailable, allowing group creation without mutual follow validation');
                return;
            }
            throw error;
        }
    }
    isCircuitBreakerOpen() {
        if (this.followerServiceCircuitBreaker.state === 'OPEN') {
            const timeSinceLastFailure = Date.now() - this.followerServiceCircuitBreaker.lastFailureTime;
            if (timeSinceLastFailure > this.circuitBreakerTimeout) {
                this.followerServiceCircuitBreaker.state = 'HALF_OPEN';
                return false;
            }
            return true;
        }
        return false;
    }
    recordFailure() {
        this.followerServiceCircuitBreaker.failureCount++;
        this.followerServiceCircuitBreaker.lastFailureTime = Date.now();
        if (this.followerServiceCircuitBreaker.failureCount >= this.failureThreshold) {
            this.followerServiceCircuitBreaker.state = 'OPEN';
            console.warn('Circuit breaker opened for follower service');
        }
    }
    resetCircuitBreaker() {
        this.followerServiceCircuitBreaker.failureCount = 0;
        this.followerServiceCircuitBreaker.state = 'CLOSED';
    }
}
exports.ChatRoomService = ChatRoomService;
//# sourceMappingURL=chat-room.service.js.map