"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRepositoryImpl = void 0;
const message_dto_1 = require("../dto/message.dto");
class MessageRepositoryImpl {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        const message = await this.db.message.create({
            data: {
                chatRoomId: data.chatRoomId,
                authorId: data.authorId,
                content: data.content,
                type: data.type,
                ...(data.isEncrypted && {
                    isEncrypted: data.isEncrypted,
                    iv: data.iv,
                    tag: data.tag
                })
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        profilePicture: true
                    }
                }
            }
        });
        return new message_dto_1.MessageDTO(message);
    }
    async findById(id) {
        const message = await this.db.message.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        profilePicture: true
                    }
                }
            }
        });
        return message ? new message_dto_1.MessageDTO(message) : null;
    }
    async findByChatRoomId(chatRoomId, limit = 50, cursor) {
        const messages = await this.db.message.findMany({
            where: { chatRoomId },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        profilePicture: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1
            })
        });
        return messages.map(message => new message_dto_1.MessageDTO(message));
    }
    async update(id, updateData) {
        const data = typeof updateData === 'string'
            ? { content: updateData }
            : updateData;
        const message = await this.db.message.update({
            where: { id },
            data: {
                content: data.content,
                ...(data.iv && { iv: data.iv }),
                ...(data.tag && { tag: data.tag }),
                ...(data.isEncrypted !== undefined && { isEncrypted: data.isEncrypted })
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        profilePicture: true
                    }
                }
            }
        });
        return new message_dto_1.MessageDTO(message);
    }
    async delete(id) {
        await this.db.message.delete({
            where: { id }
        });
    }
    async getLastMessageForChatRoom(chatRoomId) {
        const message = await this.db.message.findFirst({
            where: { chatRoomId },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        profilePicture: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return message ? new message_dto_1.MessageDTO(message) : null;
    }
    async getMessageCountAfterTimestamp(chatRoomId, timestamp) {
        return await this.db.message.count({
            where: {
                chatRoomId,
                createdAt: { gt: timestamp }
            }
        });
    }
}
exports.MessageRepositoryImpl = MessageRepositoryImpl;
//# sourceMappingURL=message.repository.impl.js.map