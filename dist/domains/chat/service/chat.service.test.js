"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chat_service_1 = require("./chat.service");
const chat_room_dto_1 = require("../dto/chat-room.dto");
const message_dto_1 = require("../dto/message.dto");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('ChatService', () => {
    let chatService;
    let mockChatRoomService;
    let mockMessageService;
    let mockChatRoomMemberService;
    let mockFollowerRepository;
    const mockChatRoom = {
        id: 'room-1',
        name: 'Test Room',
        type: chat_room_dto_1.ChatRoomType.GROUP,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const mockMessage = {
        id: 'message-1',
        chatRoomId: 'room-1',
        authorId: 'user-1',
        content: 'Test message',
        type: message_dto_1.MessageType.TEXT,
        isEncrypted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
            id: 'user-1',
            username: 'testuser',
            name: 'Test User',
            profilePicture: undefined
        }
    };
    const mockChatRoomMember = {
        id: 'member-1',
        chatRoomId: 'room-1',
        userId: 'user-1',
        joinedAt: new Date(),
        lastReadAt: new Date()
    };
    (0, globals_1.beforeEach)(async () => {
        mockChatRoomService = {
            createChatRoom: globals_1.jest.fn(),
            getChatRoom: globals_1.jest.fn(),
            getUserChatRooms: globals_1.jest.fn(),
            findOrCreateDMChatRoom: globals_1.jest.fn(),
            updateChatRoom: globals_1.jest.fn(),
            deleteChatRoom: globals_1.jest.fn(),
            getUnreadCountForUser: globals_1.jest.fn()
        };
        mockMessageService = {
            createMessage: globals_1.jest.fn(),
            getChatRoomMessages: globals_1.jest.fn(),
            getMessage: globals_1.jest.fn(),
            updateMessage: globals_1.jest.fn()
        };
        mockChatRoomMemberService = {
            addMemberToChatRoom: globals_1.jest.fn(),
            removeMemberFromChatRoom: globals_1.jest.fn(),
            getChatRoomMembers: globals_1.jest.fn(),
            updateLastRead: globals_1.jest.fn(),
            leaveChatRoom: globals_1.jest.fn()
        };
        mockFollowerRepository = {
            isFollowing: globals_1.jest.fn(),
            follow: globals_1.jest.fn(),
            unfollow: globals_1.jest.fn()
        };
        mockFollowerRepository.isFollowing.mockResolvedValue(true);
        chatService = new chat_service_1.ChatService(mockChatRoomService, mockChatRoomMemberService, mockMessageService, mockFollowerRepository);
    });
    (0, globals_1.describe)('createChatRoom', () => {
        (0, globals_1.it)('should successfully create chat room with mutual follow validation', async () => {
            const createData = {
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                memberIds: ['user-1', 'user-2']
            };
            const requesterId = 'user-1';
            const expectedRoom = {
                id: 'room-1',
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            mockChatRoomService.createChatRoom.mockResolvedValue(expectedRoom);
            const result = await chatService.createChatRoom(createData, requesterId);
            (0, globals_1.expect)(mockChatRoomService.createChatRoom).toHaveBeenCalledWith(createData, requesterId);
            (0, globals_1.expect)(result).toEqual(expectedRoom);
        });
        (0, globals_1.it)('should throw error when users do not follow each other mutually', async () => {
            const createData = {
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                memberIds: ['user-1', 'user-2']
            };
            const requesterId = 'user-1';
            mockFollowerRepository.isFollowing.mockResolvedValue(false);
            await (0, globals_1.expect)(chatService.createChatRoom(createData, requesterId))
                .rejects.toThrow('Users must follow each other to chat');
        });
        (0, globals_1.it)('should handle large groups with optimized mutual follow validation', async () => {
            const memberIds = ['user-1', 'user-2', 'user-3', 'user-4'];
            const createData = {
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                memberIds
            };
            const requesterId = 'user-1';
            const expectedRoom = {
                id: 'room-1',
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            mockChatRoomService.createChatRoom.mockResolvedValue(expectedRoom);
            const result = await chatService.createChatRoom(createData, requesterId);
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(12);
            (0, globals_1.expect)(result).toEqual(expectedRoom);
        });
        (0, globals_1.it)('should handle empty member lists gracefully', async () => {
            const createData = {
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                memberIds: []
            };
            const requesterId = 'user-1';
            mockChatRoomService.createChatRoom.mockResolvedValue({
                id: 'room-1',
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const result = await chatService.createChatRoom(createData, requesterId);
            (0, globals_1.expect)(mockChatRoomService.createChatRoom).toHaveBeenCalledWith(createData, requesterId);
            (0, globals_1.expect)(result).toBeDefined();
        });
    });
    (0, globals_1.describe)('findOrCreateDMChatRoom', () => {
        (0, globals_1.it)('should successfully create DM when users follow each other', async () => {
            const user1Id = 'user-1';
            const user2Id = 'user-2';
            const expectedRoom = {
                id: 'room-1',
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.DM,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            mockChatRoomService.findOrCreateDMChatRoom.mockResolvedValue(expectedRoom);
            const result = await chatService.findOrCreateDMChatRoom(user1Id, user2Id);
            (0, globals_1.expect)(mockChatRoomService.findOrCreateDMChatRoom).toHaveBeenCalledWith(user1Id, user2Id);
            (0, globals_1.expect)(result).toEqual(expectedRoom);
        });
        (0, globals_1.it)('should throw error when users do not follow each other', async () => {
            const user1Id = 'user-1';
            const user2Id = 'user-2';
            mockFollowerRepository.isFollowing.mockResolvedValue(false);
            await (0, globals_1.expect)(chatService.findOrCreateDMChatRoom(user1Id, user2Id))
                .rejects.toThrow('Users must follow each other to chat');
            (0, globals_1.expect)(mockChatRoomService.findOrCreateDMChatRoom).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should find existing DM when it already exists', async () => {
            const user1Id = 'user-1';
            const user2Id = 'user-2';
            const existingRoom = {
                id: 'existing-dm',
                name: 'Existing DM',
                type: chat_room_dto_1.ChatRoomType.DM,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            mockChatRoomService.findOrCreateDMChatRoom.mockResolvedValue(existingRoom);
            const result = await chatService.findOrCreateDMChatRoom(user1Id, user2Id);
            (0, globals_1.expect)(result.id).toBe('existing-dm');
            (0, globals_1.expect)(result.type).toBe(chat_room_dto_1.ChatRoomType.DM);
        });
        (0, globals_1.it)('should handle follower repository errors gracefully', async () => {
            const user1Id = 'user-1';
            const user2Id = 'user-2';
            mockFollowerRepository.isFollowing.mockRejectedValue(new Error('Follower service unavailable'));
            await (0, globals_1.expect)(chatService.findOrCreateDMChatRoom(user1Id, user2Id))
                .rejects.toThrow('Follower service unavailable');
            (0, globals_1.expect)(mockChatRoomService.findOrCreateDMChatRoom).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('getUserChatRooms', () => {
        (0, globals_1.it)('should successfully retrieve user chat rooms', async () => {
            const userId = 'user-1';
            const expectedRooms = [
                {
                    id: 'room-1',
                    name: 'Room 1',
                    type: chat_room_dto_1.ChatRoomType.GROUP,
                    memberCount: 2,
                    unreadCount: 0,
                    lastMessage: undefined
                },
                {
                    id: 'room-2',
                    name: 'Room 2',
                    type: chat_room_dto_1.ChatRoomType.GROUP,
                    memberCount: 3,
                    unreadCount: 5,
                    lastMessage: undefined
                }
            ];
            mockChatRoomService.getUserChatRooms.mockResolvedValue(expectedRooms);
            const result = await chatService.getUserChatRooms(userId);
            (0, globals_1.expect)(mockChatRoomService.getUserChatRooms).toHaveBeenCalledWith(userId);
            (0, globals_1.expect)(result).toEqual(expectedRooms);
            (0, globals_1.expect)(result).toHaveLength(2);
        });
        (0, globals_1.it)('should handle empty chat room list', async () => {
            const userId = 'user-with-no-rooms';
            mockChatRoomService.getUserChatRooms.mockResolvedValue([]);
            const result = await chatService.getUserChatRooms(userId);
            (0, globals_1.expect)(result).toEqual([]);
        });
        (0, globals_1.it)('should handle service errors gracefully', async () => {
            const userId = 'user-1';
            mockChatRoomService.getUserChatRooms.mockRejectedValue(new Error('Service unavailable'));
            await (0, globals_1.expect)(chatService.getUserChatRooms(userId))
                .rejects.toThrow('Service unavailable');
        });
    });
    (0, globals_1.describe)('sendMessage', () => {
        (0, globals_1.it)('should successfully send message', async () => {
            const messageData = {
                content: 'Test message',
                authorId: 'user-1',
                chatRoomId: 'room-1'
            };
            const expectedResponse = new message_dto_1.MessageResponseDTO({
                message: {
                    id: 'msg-1',
                    content: 'Test message',
                    authorId: 'user-1',
                    chatRoomId: 'room-1',
                    type: message_dto_1.MessageType.TEXT,
                    isEncrypted: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                chatRoom: {
                    id: 'room-1',
                    name: 'Test Room',
                    type: 'GROUP'
                }
            });
            mockMessageService.createMessage.mockResolvedValue(expectedResponse);
            const result = await chatService.sendMessage(messageData);
            (0, globals_1.expect)(mockMessageService.createMessage).toHaveBeenCalledWith(messageData);
            (0, globals_1.expect)(result).toEqual(expectedResponse);
        });
        (0, globals_1.it)('should handle message creation errors', async () => {
            const messageData = {
                content: 'Test message',
                authorId: 'user-1',
                chatRoomId: 'room-1'
            };
            mockMessageService.createMessage.mockRejectedValue(new Error('Message validation failed'));
            await (0, globals_1.expect)(chatService.sendMessage(messageData))
                .rejects.toThrow('Message validation failed');
        });
        (0, globals_1.it)('should handle empty message content', async () => {
            const messageData = {
                content: '',
                authorId: 'user-1',
                chatRoomId: 'room-1'
            };
            mockMessageService.createMessage.mockRejectedValue(new Error('Message content cannot be empty'));
            await (0, globals_1.expect)(chatService.sendMessage(messageData))
                .rejects.toThrow('Message content cannot be empty');
        });
        (0, globals_1.it)('should handle unauthorized message sending', async () => {
            const messageData = {
                content: 'Test message',
                authorId: 'unauthorized-user',
                chatRoomId: 'room-1'
            };
            mockMessageService.createMessage.mockRejectedValue(new Error('User is not a member of this chat room'));
            await (0, globals_1.expect)(chatService.sendMessage(messageData))
                .rejects.toThrow('User is not a member of this chat room');
        });
    });
    (0, globals_1.describe)('getChatRoomMessages', () => {
        (0, globals_1.it)('should successfully retrieve chat room messages', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const limit = 20;
            const cursor = 'cursor-123';
            const expectedMessages = [
                { id: 'msg-1', content: 'Message 1' },
                { id: 'msg-2', content: 'Message 2' }
            ];
            mockMessageService.getChatRoomMessages.mockResolvedValue(expectedMessages);
            const result = await chatService.getChatRoomMessages(chatRoomId, userId, limit, cursor);
            (0, globals_1.expect)(mockMessageService.getChatRoomMessages).toHaveBeenCalledWith({ chatRoomId, limit, cursor }, userId);
            (0, globals_1.expect)(result).toEqual(expectedMessages);
        });
        (0, globals_1.it)('should handle default pagination parameters', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            mockMessageService.getChatRoomMessages.mockResolvedValue([]);
            await chatService.getChatRoomMessages(chatRoomId, userId);
            (0, globals_1.expect)(mockMessageService.getChatRoomMessages).toHaveBeenCalledWith({ chatRoomId, limit: undefined, cursor: undefined }, userId);
        });
        (0, globals_1.it)('should handle unauthorized access', async () => {
            const chatRoomId = 'room-1';
            const userId = 'unauthorized-user';
            mockMessageService.getChatRoomMessages.mockRejectedValue(new Error('User is not a member of this chat room'));
            await (0, globals_1.expect)(chatService.getChatRoomMessages(chatRoomId, userId))
                .rejects.toThrow('User is not a member of this chat room');
        });
        (0, globals_1.it)('should handle empty message history', async () => {
            const chatRoomId = 'empty-room';
            const userId = 'user-1';
            mockMessageService.getChatRoomMessages.mockResolvedValue([]);
            const result = await chatService.getChatRoomMessages(chatRoomId, userId);
            (0, globals_1.expect)(result).toEqual([]);
        });
    });
    (0, globals_1.describe)('getChatRoomMembers', () => {
        (0, globals_1.it)('should successfully retrieve members when userId is provided', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const expectedMembers = [
                {
                    id: 'member-1',
                    chatRoomId: 'room-1',
                    userId: 'user-1',
                    joinedAt: new Date(),
                    lastReadAt: new Date()
                },
                {
                    id: 'member-2',
                    chatRoomId: 'room-1',
                    userId: 'user-2',
                    joinedAt: new Date(),
                    lastReadAt: new Date()
                }
            ];
            mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue(expectedMembers);
            const result = await chatService.getChatRoomMembers(chatRoomId, userId);
            (0, globals_1.expect)(mockChatRoomMemberService.getChatRoomMembers).toHaveBeenCalledWith(chatRoomId, userId);
            (0, globals_1.expect)(result).toEqual(expectedMembers);
        });
        (0, globals_1.it)('should bypass validation for internal calls (no userId)', async () => {
            const chatRoomId = 'room-1';
            const expectedMembers = [
                {
                    id: 'member-1',
                    chatRoomId: 'room-1',
                    userId: 'user-1',
                    joinedAt: new Date(),
                    lastReadAt: new Date()
                },
                {
                    id: 'member-2',
                    chatRoomId: 'room-1',
                    userId: 'user-2',
                    joinedAt: new Date(),
                    lastReadAt: new Date()
                }
            ];
            mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue(expectedMembers);
            const result = await chatService.getChatRoomMembers(chatRoomId);
            (0, globals_1.expect)(mockChatRoomMemberService.getChatRoomMembers).toHaveBeenCalledWith(chatRoomId, 'INTERNAL_BYPASS');
            (0, globals_1.expect)(result).toEqual(expectedMembers);
        });
        (0, globals_1.it)('should handle unauthorized access with userId', async () => {
            const chatRoomId = 'room-1';
            const userId = 'unauthorized-user';
            mockChatRoomMemberService.getChatRoomMembers.mockRejectedValue(new Error('User is not a member of this chat room'));
            await (0, globals_1.expect)(chatService.getChatRoomMembers(chatRoomId, userId))
                .rejects.toThrow('User is not a member of this chat room');
        });
        (0, globals_1.it)('should handle empty member list', async () => {
            const chatRoomId = 'empty-room';
            const userId = 'user-1';
            mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue([]);
            const result = await chatService.getChatRoomMembers(chatRoomId, userId);
            (0, globals_1.expect)(result).toEqual([]);
        });
    });
    (0, globals_1.describe)('validateChatRoomMembership', () => {
        (0, globals_1.it)('should return true when user is a member', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const members = [mockChatRoomMember];
            mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue(members);
            const result = await chatService.validateChatRoomMembership(chatRoomId, userId);
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(mockChatRoomMemberService.getChatRoomMembers).toHaveBeenCalledWith(chatRoomId, userId);
        });
        (0, globals_1.it)('should return false when user is not a member', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const members = [{
                    id: 'member-2',
                    chatRoomId: 'room-1',
                    userId: 'user-2',
                    joinedAt: new Date(),
                    lastReadAt: new Date()
                }];
            mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue(members);
            const result = await chatService.validateChatRoomMembership(chatRoomId, userId);
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should return false when service throws error', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            mockChatRoomMemberService.getChatRoomMembers.mockRejectedValue(new Error('Service error'));
            const result = await chatService.validateChatRoomMembership(chatRoomId, userId);
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should handle empty member list gracefully', async () => {
            const chatRoomId = 'empty-room';
            const userId = 'user-1';
            mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue([]);
            const result = await chatService.validateChatRoomMembership(chatRoomId, userId);
            (0, globals_1.expect)(result).toBe(false);
        });
    });
    (0, globals_1.describe)('getUnreadCount', () => {
        (0, globals_1.it)('should successfully return unread count', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const expectedCount = 5;
            mockChatRoomService.getUnreadCountForUser.mockResolvedValue(expectedCount);
            const result = await chatService.getUnreadCount(chatRoomId, userId);
            (0, globals_1.expect)(mockChatRoomService.getUnreadCountForUser).toHaveBeenCalledWith(chatRoomId, userId);
            (0, globals_1.expect)(result).toBe(expectedCount);
        });
        (0, globals_1.it)('should return zero when no unread messages', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            mockChatRoomService.getUnreadCountForUser.mockResolvedValue(0);
            const result = await chatService.getUnreadCount(chatRoomId, userId);
            (0, globals_1.expect)(result).toBe(0);
        });
        (0, globals_1.it)('should handle service errors gracefully', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            mockChatRoomService.getUnreadCountForUser.mockRejectedValue(new Error('Service unavailable'));
            await (0, globals_1.expect)(chatService.getUnreadCount(chatRoomId, userId))
                .rejects.toThrow('Service unavailable');
        });
    });
    (0, globals_1.describe)('updateLastRead', () => {
        (0, globals_1.it)('should successfully update last read timestamp', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const mockMember = {
                id: 'member-1',
                userId: 'user-1',
                chatRoomId: 'room-1',
                joinedAt: new Date(),
                lastReadAt: new Date()
            };
            mockChatRoomMemberService.updateLastRead.mockResolvedValue(mockMember);
            await chatService.updateLastRead(chatRoomId, userId);
            (0, globals_1.expect)(mockChatRoomMemberService.updateLastRead).toHaveBeenCalledWith({
                chatRoomId,
                userId,
                lastReadAt: globals_1.expect.any(Date)
            });
        });
        (0, globals_1.it)('should handle service errors gracefully', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            mockChatRoomMemberService.updateLastRead.mockRejectedValue(new Error('Update failed'));
            await (0, globals_1.expect)(chatService.updateLastRead(chatRoomId, userId))
                .rejects.toThrow('Update failed');
        });
        (0, globals_1.it)('should handle concurrent updates', async () => {
            const chatRoomId = 'room-1';
            const userId1 = 'user-1';
            const userId2 = 'user-2';
            const mockMember1 = {
                id: 'member-1',
                userId: 'user-1',
                chatRoomId: 'room-1',
                joinedAt: new Date(),
                lastReadAt: new Date()
            };
            const mockMember2 = {
                id: 'member-2',
                userId: 'user-2',
                chatRoomId: 'room-1',
                joinedAt: new Date(),
                lastReadAt: new Date()
            };
            mockChatRoomMemberService.updateLastRead
                .mockResolvedValueOnce(mockMember1)
                .mockResolvedValueOnce(mockMember2);
            await Promise.all([
                chatService.updateLastRead(chatRoomId, userId1),
                chatService.updateLastRead(chatRoomId, userId2)
            ]);
            (0, globals_1.expect)(mockChatRoomMemberService.updateLastRead).toHaveBeenCalledTimes(2);
        });
    });
    (0, globals_1.describe)('Integration Scenarios', () => {
        (0, globals_1.it)('should handle complete chat flow: create room, send message, read messages', async () => {
            const createData = {
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                memberIds: ['user-1', 'user-2']
            };
            const requesterId = 'user-1';
            const messageData = {
                content: 'Test message',
                authorId: 'user-1',
                chatRoomId: 'room-1'
            };
            const room = {
                id: 'room-1',
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const messageResponse = new message_dto_1.MessageResponseDTO({
                message: {
                    id: 'msg-1',
                    content: 'Test message',
                    authorId: 'user-1',
                    chatRoomId: 'room-1',
                    type: message_dto_1.MessageType.TEXT,
                    isEncrypted: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                chatRoom: {
                    id: 'room-1',
                    name: 'Test Room',
                    type: 'GROUP'
                }
            });
            const messages = [{ id: 'msg-1', content: 'Test message' }];
            mockChatRoomService.createChatRoom.mockResolvedValue(room);
            mockMessageService.createMessage.mockResolvedValue(messageResponse);
            mockMessageService.getChatRoomMessages.mockResolvedValue(messages);
            const createdRoom = await chatService.createChatRoom(createData, requesterId);
            const sentMessage = await chatService.sendMessage(messageData);
            const retrievedMessages = await chatService.getChatRoomMessages(room.id, requesterId);
            (0, globals_1.expect)(createdRoom).toEqual(room);
            (0, globals_1.expect)(sentMessage).toEqual(messageResponse);
            (0, globals_1.expect)(retrievedMessages).toEqual(messages);
        });
        (0, globals_1.it)('should handle DM creation and messaging flow', async () => {
            const user1Id = 'user-1';
            const user2Id = 'user-2';
            const dmRoom = {
                id: 'room-1',
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.DM,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const messageData = {
                content: 'Test message',
                authorId: 'user-1',
                chatRoomId: dmRoom.id
            };
            const messageResponse = new message_dto_1.MessageResponseDTO({
                message: {
                    id: 'msg-1',
                    content: 'Test message',
                    authorId: 'user-1',
                    chatRoomId: 'room-1',
                    type: message_dto_1.MessageType.TEXT,
                    isEncrypted: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                chatRoom: {
                    id: 'room-1',
                    name: 'Test Room',
                    type: 'GROUP'
                }
            });
            mockChatRoomService.findOrCreateDMChatRoom.mockResolvedValue(dmRoom);
            mockMessageService.createMessage.mockResolvedValue(messageResponse);
            const dm = await chatService.findOrCreateDMChatRoom(user1Id, user2Id);
            const message = await chatService.sendMessage(messageData);
            (0, globals_1.expect)(dm.type).toBe(chat_room_dto_1.ChatRoomType.DM);
            (0, globals_1.expect)(message.message.chatRoomId).toBe(dmRoom.id);
        });
        (0, globals_1.it)('should handle member management flow', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const members = [mockChatRoomMember];
            mockChatRoomMemberService.getChatRoomMembers.mockResolvedValue(members);
            const mockUpdatedMember = {
                id: 'member-1',
                userId: 'user-1',
                chatRoomId: 'room-1',
                joinedAt: new Date(),
                lastReadAt: new Date()
            };
            mockChatRoomMemberService.updateLastRead.mockResolvedValue(mockUpdatedMember);
            const retrievedMembers = await chatService.getChatRoomMembers(chatRoomId, userId);
            const isValid = await chatService.validateChatRoomMembership(chatRoomId, userId);
            await chatService.updateLastRead(chatRoomId, userId);
            (0, globals_1.expect)(retrievedMembers).toEqual(members);
            (0, globals_1.expect)(isValid).toBe(true);
            (0, globals_1.expect)(mockChatRoomMemberService.updateLastRead).toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle error propagation through service layers', async () => {
            const createData = {
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                memberIds: ['user-1', 'user-2']
            };
            const requesterId = 'user-1';
            mockChatRoomService.createChatRoom.mockRejectedValue(new Error('External service down'));
            await (0, globals_1.expect)(chatService.createChatRoom(createData, requesterId))
                .rejects.toThrow('External service down');
            (0, globals_1.expect)(mockChatRoomService.createChatRoom).toHaveBeenCalledWith(createData, requesterId);
        });
        (0, globals_1.it)('should handle partial service failures gracefully', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            mockChatRoomMemberService.getChatRoomMembers
                .mockResolvedValueOnce([mockChatRoomMember])
                .mockRejectedValueOnce(new Error('Service temporarily unavailable'));
            const firstResult = await chatService.validateChatRoomMembership(chatRoomId, userId);
            const secondResult = await chatService.validateChatRoomMembership(chatRoomId, userId);
            (0, globals_1.expect)(firstResult).toBe(true);
            (0, globals_1.expect)(secondResult).toBe(false);
        });
    });
    (0, globals_1.describe)('Performance and Optimization', () => {
        (0, globals_1.it)('should handle concurrent chat operations efficiently', async () => {
            const operations = Array.from({ length: 10 }, (_, i) => ({
                createData: {
                    name: `Room ${i}`,
                    type: chat_room_dto_1.ChatRoomType.GROUP,
                    memberIds: ['user-1', 'user-2']
                },
                requesterId: `user-${i}`
            }));
            mockChatRoomService.createChatRoom.mockImplementation((data) => Promise.resolve({
                id: 'room-1',
                name: data.name,
                type: chat_room_dto_1.ChatRoomType.GROUP,
                createdAt: new Date(),
                updatedAt: new Date()
            }));
            const start = Date.now();
            const results = await Promise.all(operations.map(op => chatService.createChatRoom(op.createData, op.requesterId)));
            const duration = Date.now() - start;
            (0, globals_1.expect)(results).toHaveLength(10);
            (0, globals_1.expect)(duration).toBeLessThan(500);
            (0, globals_1.expect)(mockChatRoomService.createChatRoom).toHaveBeenCalledTimes(10);
        });
        (0, globals_1.it)('should optimize follower validation for large groups', async () => {
            const memberIds = Array.from({ length: 20 }, (_, i) => `user-${i}`);
            const createData = {
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                memberIds
            };
            const requesterId = 'user-0';
            mockChatRoomService.createChatRoom.mockResolvedValue({
                id: 'room-1',
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const start = Date.now();
            await chatService.createChatRoom(createData, requesterId);
            const duration = Date.now() - start;
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(380);
            (0, globals_1.expect)(duration).toBeLessThan(1000);
        });
        (0, globals_1.it)('should handle high-frequency message sending', async () => {
            const messages = Array.from({ length: 100 }, (_, i) => ({
                content: `Message ${i}`,
                authorId: 'user-1',
                chatRoomId: 'room-1'
            }));
            mockMessageService.createMessage.mockImplementation((data) => Promise.resolve(new message_dto_1.MessageResponseDTO({
                message: {
                    id: 'msg-1',
                    content: data.content,
                    authorId: data.authorId,
                    chatRoomId: data.chatRoomId,
                    type: message_dto_1.MessageType.TEXT,
                    isEncrypted: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                chatRoom: {
                    id: data.chatRoomId,
                    name: 'Test Room',
                    type: 'GROUP'
                }
            })));
            const start = Date.now();
            const results = await Promise.all(messages.map(msg => chatService.sendMessage(msg)));
            const duration = Date.now() - start;
            (0, globals_1.expect)(results).toHaveLength(100);
            (0, globals_1.expect)(duration).toBeLessThan(1000);
            (0, globals_1.expect)(mockMessageService.createMessage).toHaveBeenCalledTimes(100);
        });
    });
    (0, globals_1.describe)('Edge Cases and Security', () => {
        (0, globals_1.it)('should handle malformed data gracefully', async () => {
            const malformedData = { invalid: 'data' };
            const requesterId = 'user-1';
            await (0, globals_1.expect)(chatService.createChatRoom(malformedData, requesterId))
                .rejects.toThrow('Cannot read properties of undefined');
        });
        (0, globals_1.it)('should handle very long user IDs and chat room IDs', async () => {
            const longId = 'x'.repeat(10000);
            const createData = {
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                memberIds: [longId, 'user-2']
            };
            mockChatRoomService.createChatRoom.mockResolvedValue({
                id: 'room-1',
                name: 'Test Room',
                type: chat_room_dto_1.ChatRoomType.GROUP,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const result = await chatService.createChatRoom(createData, longId);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(mockChatRoomService.createChatRoom).toHaveBeenCalledWith(createData, longId);
        });
        (0, globals_1.it)('should maintain security boundaries between services', async () => {
            const chatRoomId = 'room-1';
            const unauthorizedUserId = 'hacker';
            mockChatRoomMemberService.getChatRoomMembers.mockRejectedValue(new Error('User is not a member of this chat room'));
            await (0, globals_1.expect)(chatService.getChatRoomMembers(chatRoomId, unauthorizedUserId))
                .rejects.toThrow('User is not a member of this chat room');
            (0, globals_1.expect)(mockChatRoomMemberService.getChatRoomMembers).toHaveBeenCalledWith(chatRoomId, unauthorizedUserId);
        });
        (0, globals_1.it)('should handle service degradation scenarios', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            mockChatRoomService.getUnreadCountForUser
                .mockRejectedValueOnce(new Error('Service temporarily down'))
                .mockResolvedValueOnce(5);
            await (0, globals_1.expect)(chatService.getUnreadCount(chatRoomId, userId))
                .rejects.toThrow('Service temporarily down');
            const result = await chatService.getUnreadCount(chatRoomId, userId);
            (0, globals_1.expect)(result).toBe(5);
        });
    });
});
//# sourceMappingURL=chat.service.test.js.map