"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRoomMemberService = void 0;
class ChatRoomMemberService {
    chatRoomMemberRepository;
    chatRoomRepository;
    constructor(chatRoomMemberRepository, chatRoomRepository) {
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.chatRoomRepository = chatRoomRepository;
    }
    async addMemberToChatRoom(data, requesterId) {
        await this.validateMembership(data.chatRoomId, requesterId);
        await this.validateChatRoomExists(data.chatRoomId);
        return await this.chatRoomMemberRepository.addMember(data);
    }
    async removeMemberFromChatRoom(chatRoomId, userId, requesterId) {
        await this.validateMembership(chatRoomId, requesterId);
        if (userId !== requesterId) {
            throw new Error('You can only remove yourself from chat rooms');
        }
        await this.chatRoomMemberRepository.removeMember(chatRoomId, userId);
    }
    async getChatRoomMembers(chatRoomId, requesterId) {
        await this.validateMembership(chatRoomId, requesterId);
        return await this.chatRoomMemberRepository.findByChatRoomId(chatRoomId);
    }
    async updateLastRead(data) {
        return await this.chatRoomMemberRepository.updateLastRead(data);
    }
    async leaveChatRoom(chatRoomId, userId) {
        await this.chatRoomMemberRepository.removeMember(chatRoomId, userId);
    }
    async validateChatRoomExists(chatRoomId) {
        const chatRoom = await this.chatRoomRepository.findById(chatRoomId);
        if (!chatRoom) {
            throw new Error('Chat room not found');
        }
    }
    async validateMembership(chatRoomId, userId) {
        const isMember = await this.chatRoomMemberRepository.isMember(chatRoomId, userId);
        if (!isMember) {
            throw new Error('User is not a member of this chat room');
        }
    }
}
exports.ChatRoomMemberService = ChatRoomMemberService;
//# sourceMappingURL=chat-room-member.service.js.map