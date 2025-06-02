"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRoomRepositoryImpl = void 0;
const chat_room_dto_1 = require("../dto/chat-room.dto");
class ChatRoomRepositoryImpl {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        const chatRoom = await this.db.chatRoom.create({
            data: {
                name: data.name || null,
                type: data.type,
                members: {
                    create: data.memberIds.map(userId => ({
                        userId,
                        joinedAt: new Date(),
                    }))
                }
            },
            include: {
                members: {
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
                }
            }
        });
        return new chat_room_dto_1.ChatRoomDTO({
            id: chatRoom.id,
            name: chatRoom.name,
            type: chatRoom.type,
            createdAt: chatRoom.createdAt,
            updatedAt: chatRoom.updatedAt,
            members: chatRoom.members.map(member => ({
                id: member.id,
                chatRoomId: member.chatRoomId,
                userId: member.userId,
                joinedAt: member.joinedAt,
                lastReadAt: member.lastReadAt,
                user: {
                    id: member.user.id,
                    username: member.user.username,
                    name: member.user.name,
                    profilePicture: member.user.profilePicture
                }
            }))
        });
    }
    async findById(id) {
        const chatRoom = await this.db.chatRoom.findUnique({
            where: { id },
            include: {
                members: {
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
                }
            }
        });
        if (!chatRoom)
            return null;
        return new chat_room_dto_1.ChatRoomDTO({
            id: chatRoom.id,
            name: chatRoom.name,
            type: chatRoom.type,
            createdAt: chatRoom.createdAt,
            updatedAt: chatRoom.updatedAt,
            members: chatRoom.members.map(member => ({
                id: member.id,
                chatRoomId: member.chatRoomId,
                userId: member.userId,
                joinedAt: member.joinedAt,
                lastReadAt: member.lastReadAt,
                user: {
                    id: member.user.id,
                    username: member.user.username,
                    name: member.user.name,
                    profilePicture: member.user.profilePicture
                }
            }))
        });
    }
    async findByUserId(userId) {
        const rooms = await this.db.chatRoom.findMany({
            where: {
                members: {
                    some: {
                        userId
                    }
                }
            },
            include: {
                members: {
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
                }
            }
        });
        return rooms.map(room => new chat_room_dto_1.ChatRoomDTO({
            id: room.id,
            name: room.name,
            type: room.type,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
            members: room.members.map(member => ({
                id: member.id,
                chatRoomId: member.chatRoomId,
                userId: member.userId,
                joinedAt: member.joinedAt,
                lastReadAt: member.lastReadAt,
                user: {
                    id: member.user.id,
                    username: member.user.username,
                    name: member.user.name,
                    profilePicture: member.user.profilePicture
                }
            }))
        }));
    }
    async findDMByUserIds(userId1, userId2) {
        const chatRoom = await this.db.chatRoom.findFirst({
            where: {
                type: 'DM',
                members: {
                    every: {
                        OR: [
                            { userId: userId1 },
                            { userId: userId2 }
                        ]
                    }
                }
            },
            include: {
                members: {
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
                }
            }
        });
        if (!chatRoom)
            return null;
        return new chat_room_dto_1.ChatRoomDTO({
            id: chatRoom.id,
            name: chatRoom.name,
            type: chatRoom.type,
            createdAt: chatRoom.createdAt,
            updatedAt: chatRoom.updatedAt,
            members: chatRoom.members.map(member => ({
                id: member.id,
                chatRoomId: member.chatRoomId,
                userId: member.userId,
                joinedAt: member.joinedAt,
                lastReadAt: member.lastReadAt,
                user: {
                    id: member.user.id,
                    username: member.user.username,
                    name: member.user.name,
                    profilePicture: member.user.profilePicture
                }
            }))
        });
    }
    async findByMemberId(userId) {
        return this.findByUserId(userId);
    }
    async findDMBetweenUsers(user1Id, user2Id) {
        return this.findDMByUserIds(user1Id, user2Id);
    }
    async update(id, data) {
        const chatRoom = await this.db.chatRoom.update({
            where: { id },
            data: {
                name: data.name || null
            },
            include: {
                members: {
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
                }
            }
        });
        return new chat_room_dto_1.ChatRoomDTO({
            id: chatRoom.id,
            name: chatRoom.name,
            type: chatRoom.type,
            createdAt: chatRoom.createdAt,
            updatedAt: chatRoom.updatedAt,
            members: chatRoom.members.map(member => ({
                id: member.id,
                chatRoomId: member.chatRoomId,
                userId: member.userId,
                joinedAt: member.joinedAt,
                lastReadAt: member.lastReadAt,
                user: {
                    id: member.user.id,
                    username: member.user.username,
                    name: member.user.name,
                    profilePicture: member.user.profilePicture
                }
            }))
        });
    }
    async delete(id) {
        await this.db.chatRoom.delete({
            where: { id }
        });
    }
    async getUnreadCountForUser(chatRoomId, userId) {
        const member = await this.db.chatRoomMember.findUnique({
            where: {
                chatRoomId_userId: {
                    chatRoomId,
                    userId
                }
            }
        });
        if (!member)
            return 0;
        const unreadCount = await this.db.message.count({
            where: {
                chatRoomId,
                createdAt: {
                    gt: member.lastReadAt || new Date(0)
                },
                authorId: {
                    not: userId
                }
            }
        });
        return unreadCount;
    }
    async findOrCreateDMTransaction(user1Id, user2Id) {
        return await this.db.$transaction(async (prisma) => {
            const existingDM = await prisma.chatRoom.findFirst({
                where: {
                    type: 'DM',
                    AND: [
                        {
                            members: {
                                some: { userId: user1Id }
                            }
                        },
                        {
                            members: {
                                some: { userId: user2Id }
                            }
                        }
                    ],
                    members: {
                        every: {
                            userId: { in: [user1Id, user2Id] }
                        }
                    }
                },
                include: {
                    members: {
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
                    }
                }
            });
            if (existingDM) {
                return new chat_room_dto_1.ChatRoomDTO({
                    id: existingDM.id,
                    name: existingDM.name,
                    type: existingDM.type,
                    createdAt: existingDM.createdAt,
                    updatedAt: existingDM.updatedAt,
                    members: existingDM.members.map(member => ({
                        id: member.id,
                        chatRoomId: member.chatRoomId,
                        userId: member.userId,
                        joinedAt: member.joinedAt,
                        lastReadAt: member.lastReadAt,
                        user: {
                            id: member.user.id,
                            username: member.user.username,
                            name: member.user.name,
                            profilePicture: member.user.profilePicture
                        }
                    }))
                });
            }
            const newChatRoom = await prisma.chatRoom.create({
                data: {
                    type: 'DM',
                    members: {
                        create: [
                            { userId: user1Id },
                            { userId: user2Id }
                        ]
                    }
                },
                include: {
                    members: {
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
                    }
                }
            });
            return new chat_room_dto_1.ChatRoomDTO({
                id: newChatRoom.id,
                name: newChatRoom.name,
                type: newChatRoom.type,
                createdAt: newChatRoom.createdAt,
                updatedAt: newChatRoom.updatedAt,
                members: newChatRoom.members.map(member => ({
                    id: member.id,
                    chatRoomId: member.chatRoomId,
                    userId: member.userId,
                    joinedAt: member.joinedAt,
                    lastReadAt: member.lastReadAt,
                    user: {
                        id: member.user.id,
                        username: member.user.username,
                        name: member.user.name,
                        profilePicture: member.user.profilePicture
                    }
                }))
            });
        });
    }
    async createWithTransaction(data) {
        return await this.db.$transaction(async (prisma) => {
            const chatRoom = await prisma.chatRoom.create({
                data: {
                    name: data.name || null,
                    type: data.type,
                    members: {
                        create: data.memberIds.map(userId => ({
                            userId,
                            joinedAt: new Date(),
                        }))
                    }
                },
                include: {
                    members: {
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
                    }
                }
            });
            return new chat_room_dto_1.ChatRoomDTO({
                id: chatRoom.id,
                name: chatRoom.name,
                type: chatRoom.type,
                createdAt: chatRoom.createdAt,
                updatedAt: chatRoom.updatedAt,
                members: chatRoom.members.map(member => ({
                    id: member.id,
                    chatRoomId: member.chatRoomId,
                    userId: member.userId,
                    joinedAt: member.joinedAt,
                    lastReadAt: member.lastReadAt,
                    user: {
                        id: member.user.id,
                        username: member.user.username,
                        name: member.user.name,
                        profilePicture: member.user.profilePicture
                    }
                }))
            });
        });
    }
}
exports.ChatRoomRepositoryImpl = ChatRoomRepositoryImpl;
//# sourceMappingURL=chat-room.repository.impl.js.map