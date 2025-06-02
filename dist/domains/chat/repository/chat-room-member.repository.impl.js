"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRoomMemberRepositoryImpl = void 0;
const chat_room_member_dto_1 = require("../dto/chat-room-member.dto");
class ChatRoomMemberRepositoryImpl {
    db;
    constructor(db) {
        this.db = db;
    }
    async addMember(data) {
        const member = await this.db.chatRoomMember.create({
            data: {
                chatRoomId: data.chatRoomId,
                userId: data.userId
            }
        });
        return new chat_room_member_dto_1.ChatRoomMemberDTO(member);
    }
    async removeMember(chatRoomId, userId) {
        await this.db.chatRoomMember.delete({
            where: {
                chatRoomId_userId: {
                    chatRoomId,
                    userId
                }
            }
        });
    }
    async findByChatRoomId(chatRoomId) {
        const members = await this.db.chatRoomMember.findMany({
            where: { chatRoomId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        profilePicture: true
                    }
                }
            }
        });
        return members.map(member => new chat_room_member_dto_1.ChatRoomMemberDTO(member));
    }
    async findByUserId(userId) {
        const members = await this.db.chatRoomMember.findMany({
            where: { userId },
            include: {
                chatRoom: true
            }
        });
        return members.map(member => new chat_room_member_dto_1.ChatRoomMemberDTO(member));
    }
    async isMember(chatRoomId, userId) {
        const member = await this.db.chatRoomMember.findUnique({
            where: {
                chatRoomId_userId: {
                    chatRoomId,
                    userId
                }
            }
        });
        return !!member;
    }
    async updateLastRead(data) {
        const member = await this.db.chatRoomMember.update({
            where: {
                chatRoomId_userId: {
                    chatRoomId: data.chatRoomId,
                    userId: data.userId
                }
            },
            data: {
                lastReadAt: data.lastReadAt
            }
        });
        return new chat_room_member_dto_1.ChatRoomMemberDTO(member);
    }
    async getMemberCount(chatRoomId) {
        return await this.db.chatRoomMember.count({
            where: { chatRoomId }
        });
    }
}
exports.ChatRoomMemberRepositoryImpl = ChatRoomMemberRepositoryImpl;
//# sourceMappingURL=chat-room-member.repository.impl.js.map