"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
class ChatService {
    chatRoomService;
    chatRoomMemberService;
    messageService;
    followerRepository;
    constructor(chatRoomService, chatRoomMemberService, messageService, followerRepository) {
        this.chatRoomService = chatRoomService;
        this.chatRoomMemberService = chatRoomMemberService;
        this.messageService = messageService;
        this.followerRepository = followerRepository;
    }
    async createChatRoom(data, requesterId) {
        const updatedChatRoomService = this.createUpdatedChatRoomService();
        return await updatedChatRoomService.createChatRoom(data, requesterId);
    }
    async findOrCreateDMChatRoom(user1Id, user2Id) {
        await this.validateMutualFollow(user1Id, user2Id);
        const updatedChatRoomService = this.createUpdatedChatRoomService();
        return await updatedChatRoomService.findOrCreateDMChatRoom(user1Id, user2Id);
    }
    async getUserChatRooms(userId) {
        return await this.chatRoomService.getUserChatRooms(userId);
    }
    async sendMessage(data) {
        return await this.messageService.createMessage(data);
    }
    async getChatRoomMessages(chatRoomId, userId, limit, cursor) {
        return await this.messageService.getChatRoomMessages({ chatRoomId, limit, cursor }, userId);
    }
    async getChatRoomMembers(chatRoomId, userId) {
        if (!userId) {
            return await this.chatRoomMemberService.getChatRoomMembers(chatRoomId, 'INTERNAL_BYPASS');
        }
        return await this.chatRoomMemberService.getChatRoomMembers(chatRoomId, userId);
    }
    async validateChatRoomMembership(chatRoomId, userId) {
        try {
            const members = await this.chatRoomMemberService.getChatRoomMembers(chatRoomId, userId);
            return members.some(member => member.userId === userId);
        }
        catch (error) {
            return false;
        }
    }
    async getUnreadCount(chatRoomId, userId) {
        return await this.chatRoomService.getUnreadCountForUser(chatRoomId, userId);
    }
    async updateLastRead(chatRoomId, userId) {
        await this.chatRoomMemberService.updateLastRead({
            chatRoomId,
            userId,
            lastReadAt: new Date()
        });
    }
    async validateMutualFollow(user1Id, user2Id) {
        const user1FollowsUser2 = await this.followerRepository.isFollowing(user1Id, user2Id);
        const user2FollowsUser1 = await this.followerRepository.isFollowing(user2Id, user1Id);
        if (!user1FollowsUser2 || !user2FollowsUser1) {
            throw new Error('Users must follow each other to chat');
        }
    }
    async validateMutualFollowsForGroup(memberIds) {
        for (let i = 0; i < memberIds.length; i++) {
            for (let j = i + 1; j < memberIds.length; j++) {
                await this.validateMutualFollow(memberIds[i], memberIds[j]);
            }
        }
    }
    createUpdatedChatRoomService() {
        return {
            createChatRoom: async (data, requesterId) => {
                await this.validateMutualFollowsForGroup(data.memberIds);
                return await this.chatRoomService.createChatRoom(data, requesterId);
            },
            findOrCreateDMChatRoom: async (user1Id, user2Id) => {
                return await this.chatRoomService.findOrCreateDMChatRoom(user1Id, user2Id);
            }
        };
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=chat.service.js.map