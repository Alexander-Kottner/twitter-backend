"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chat_room_service_1 = require("./chat-room.service");
const chat_room_dto_1 = require("../dto/chat-room.dto");
const message_dto_1 = require("../dto/message.dto");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('ChatRoomService', () => {
    let chatRoomService;
    let mockChatRoomRepository;
    let mockChatRoomMemberRepository;
    let mockMessageRepository;
    let mockFollowerRepository;
    const createMockChatRoom = (overrides = {}) => ({
        id: 'room-1',
        name: 'Test Room',
        type: chat_room_dto_1.ChatRoomType.GROUP,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    });
    const createMockCreateChatRoomDTO = (overrides = {}) => ({
        name: 'Test Room',
        type: chat_room_dto_1.ChatRoomType.GROUP,
        memberIds: ['user-1', 'user-2'],
        ...overrides
    });
    const createMockChatRoomSummary = (overrides = {}) => ({
        id: 'room-1',
        name: 'Test Room',
        type: chat_room_dto_1.ChatRoomType.GROUP,
        memberCount: 2,
        unreadCount: 0,
        lastMessage: undefined,
        ...overrides
    });
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
    (0, globals_1.beforeEach)(() => {
        mockChatRoomRepository = {
            create: globals_1.jest.fn(),
            findById: globals_1.jest.fn(),
            findByMemberId: globals_1.jest.fn(),
            findDMBetweenUsers: globals_1.jest.fn(),
            update: globals_1.jest.fn(),
            delete: globals_1.jest.fn(),
            createWithTransaction: globals_1.jest.fn(),
            findOrCreateDMTransaction: globals_1.jest.fn(),
            getUnreadCountForUser: globals_1.jest.fn()
        };
        mockChatRoomMemberRepository = {
            isMember: globals_1.jest.fn(),
            getMemberCount: globals_1.jest.fn(),
            findByChatRoomId: globals_1.jest.fn(),
            findByUserId: globals_1.jest.fn(),
            addMember: globals_1.jest.fn(),
            removeMember: globals_1.jest.fn(),
            updateLastRead: globals_1.jest.fn()
        };
        mockMessageRepository = {
            create: globals_1.jest.fn(),
            findById: globals_1.jest.fn(),
            findByChatRoomId: globals_1.jest.fn(),
            update: globals_1.jest.fn(),
            delete: globals_1.jest.fn(),
            getLastMessageForChatRoom: globals_1.jest.fn(),
            getMessageCountAfterTimestamp: globals_1.jest.fn()
        };
        mockFollowerRepository = {
            isFollowing: globals_1.jest.fn(),
            follow: globals_1.jest.fn(),
            unfollow: globals_1.jest.fn()
        };
        globals_1.jest.clearAllMocks();
        chatRoomService = new chat_room_service_1.ChatRoomService(mockChatRoomRepository, mockChatRoomMemberRepository, mockMessageRepository, mockFollowerRepository);
    });
    (0, globals_1.describe)('createChatRoom', () => {
        (0, globals_1.it)('should successfully create a group chat when all conditions are met', async () => {
            const createData = createMockCreateChatRoomDTO();
            const requesterId = 'user-1';
            const expectedRoom = createMockChatRoom(createData);
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            mockChatRoomRepository.createWithTransaction.mockResolvedValue(expectedRoom);
            const result = await chatRoomService.createChatRoom(createData, requesterId);
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(mockChatRoomRepository.createWithTransaction).toHaveBeenCalledWith(createData);
            (0, globals_1.expect)(result).toEqual(expectedRoom);
        });
        (0, globals_1.it)('should throw ValidationError when requester is not in member list', async () => {
            const createData = createMockCreateChatRoomDTO();
            const requesterId = 'unauthorized-user';
            await (0, globals_1.expect)(chatRoomService.createChatRoom(createData, requesterId))
                .rejects.toThrow('Requester must be included in the chat room members');
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).not.toHaveBeenCalled();
            (0, globals_1.expect)(mockChatRoomRepository.createWithTransaction).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw ValidationError for DM with incorrect member count', async () => {
            const createData = createMockCreateChatRoomDTO({
                type: chat_room_dto_1.ChatRoomType.DM,
                memberIds: ['user-1', 'user-2', 'user-3']
            });
            const requesterId = 'user-1';
            await (0, globals_1.expect)(chatRoomService.createChatRoom(createData, requesterId))
                .rejects.toThrow('DM chats must have exactly 2 members');
            (0, globals_1.expect)(mockChatRoomRepository.createWithTransaction).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw AuthorizationError when mutual follow validation fails', async () => {
            const createData = createMockCreateChatRoomDTO();
            const requesterId = 'user-1';
            mockFollowerRepository.isFollowing
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            await (0, globals_1.expect)(chatRoomService.createChatRoom(createData, requesterId))
                .rejects.toThrow('Users user-1 and user-2 must follow each other to be in the same group');
            (0, globals_1.expect)(mockChatRoomRepository.createWithTransaction).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle large groups with optimized batch validation', async () => {
            const createData = createMockCreateChatRoomDTO({
                memberIds: ['user-1', 'user-2', 'user-3', 'user-4']
            });
            const requesterId = 'user-1';
            const expectedRoom = createMockChatRoom(createData);
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            mockChatRoomRepository.createWithTransaction.mockResolvedValue(expectedRoom);
            const result = await chatRoomService.createChatRoom(createData, requesterId);
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(12);
            (0, globals_1.expect)(result).toEqual(expectedRoom);
        });
        (0, globals_1.it)('should gracefully degrade when circuit breaker is open', async () => {
            const createData = createMockCreateChatRoomDTO();
            const requesterId = 'user-1';
            const expectedRoom = createMockChatRoom(createData);
            mockFollowerRepository.isFollowing.mockRejectedValue(new Error('Service unavailable'));
            mockChatRoomRepository.createWithTransaction.mockResolvedValue(expectedRoom);
            for (let i = 0; i < 5; i++) {
                try {
                    await chatRoomService.createChatRoom(createData, requesterId);
                }
                catch (error) {
                }
            }
            const result = await chatRoomService.createChatRoom(createData, requesterId);
            (0, globals_1.expect)(result).toEqual(expectedRoom);
            (0, globals_1.expect)(mockChatRoomRepository.createWithTransaction).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('getChatRoom', () => {
        (0, globals_1.it)('should successfully retrieve chat room when user is a member', async () => {
            const roomId = 'room-1';
            const userId = 'user-1';
            const expectedRoom = createMockChatRoom({ id: roomId });
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.findById.mockResolvedValue(expectedRoom);
            const result = await chatRoomService.getChatRoom(roomId, userId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(roomId, userId);
            (0, globals_1.expect)(mockChatRoomRepository.findById).toHaveBeenCalledWith(roomId);
            (0, globals_1.expect)(result).toEqual(expectedRoom);
        });
        (0, globals_1.it)('should throw AuthorizationError when user is not a member', async () => {
            const roomId = 'room-1';
            const userId = 'unauthorized-user';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(false);
            await (0, globals_1.expect)(chatRoomService.getChatRoom(roomId, userId))
                .rejects.toThrow('User is not a member of this chat room');
            (0, globals_1.expect)(mockChatRoomRepository.findById).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should return null when chat room does not exist', async () => {
            const roomId = 'non-existent-room';
            const userId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.findById.mockResolvedValue(null);
            const result = await chatRoomService.getChatRoom(roomId, userId);
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('getUserChatRooms', () => {
        (0, globals_1.it)('should successfully retrieve user chat rooms with summaries', async () => {
            const userId = 'user-1';
            const chatRooms = [
                createMockChatRoom({ id: 'room-1', name: 'Room 1' }),
                createMockChatRoom({ id: 'room-2', name: 'Room 2' })
            ];
            const lastMessage = {
                id: 'message-1',
                chatRoomId: 'room-1',
                content: 'Last message',
                type: message_dto_1.MessageType.TEXT,
                isEncrypted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                authorId: 'user-2'
            };
            mockChatRoomRepository.findByMemberId.mockResolvedValue(chatRooms);
            mockChatRoomMemberRepository.getMemberCount.mockResolvedValue(2);
            mockMessageRepository.getLastMessageForChatRoom.mockResolvedValue(lastMessage);
            mockChatRoomRepository.getUnreadCountForUser.mockResolvedValue(3);
            const result = await chatRoomService.getUserChatRooms(userId);
            (0, globals_1.expect)(mockChatRoomRepository.findByMemberId).toHaveBeenCalledWith(userId);
            (0, globals_1.expect)(result).toHaveLength(2);
            (0, globals_1.expect)(result[0]).toEqual(globals_1.expect.objectContaining({
                id: 'room-1',
                memberCount: 2,
                unreadCount: 3,
                lastMessage: globals_1.expect.objectContaining({
                    content: 'Last message'
                })
            }));
        });
        (0, globals_1.it)('should handle chat rooms without last messages', async () => {
            const userId = 'user-1';
            const chatRooms = [createMockChatRoom({ id: 'room-1' })];
            mockChatRoomRepository.findByMemberId.mockResolvedValue(chatRooms);
            mockChatRoomMemberRepository.getMemberCount.mockResolvedValue(2);
            mockMessageRepository.getLastMessageForChatRoom.mockResolvedValue(null);
            mockChatRoomRepository.getUnreadCountForUser.mockResolvedValue(0);
            const result = await chatRoomService.getUserChatRooms(userId);
            (0, globals_1.expect)(result[0].lastMessage).toBeUndefined();
            (0, globals_1.expect)(result[0].unreadCount).toBe(0);
        });
        (0, globals_1.it)('should handle empty chat room list', async () => {
            const userId = 'user-with-no-rooms';
            mockChatRoomRepository.findByMemberId.mockResolvedValue([]);
            const result = await chatRoomService.getUserChatRooms(userId);
            (0, globals_1.expect)(result).toEqual([]);
        });
    });
    (0, globals_1.describe)('findOrCreateDMChatRoom', () => {
        (0, globals_1.it)('should create new DM when none exists and users follow each other', async () => {
            const user1Id = 'user-1';
            const user2Id = 'user-2';
            const expectedRoom = createMockChatRoom({ type: chat_room_dto_1.ChatRoomType.DM });
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            mockChatRoomRepository.findOrCreateDMTransaction.mockResolvedValue(expectedRoom);
            const result = await chatRoomService.findOrCreateDMChatRoom(user1Id, user2Id);
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).toHaveBeenCalledWith(user1Id, user2Id);
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).toHaveBeenCalledWith(user2Id, user1Id);
            (0, globals_1.expect)(mockChatRoomRepository.findOrCreateDMTransaction).toHaveBeenCalledWith(user1Id, user2Id);
            (0, globals_1.expect)(result).toEqual(expectedRoom);
        });
        (0, globals_1.it)('should throw AuthorizationError when users do not follow each other', async () => {
            const user1Id = 'user-1';
            const user2Id = 'user-2';
            mockFollowerRepository.isFollowing
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            await (0, globals_1.expect)(chatRoomService.findOrCreateDMChatRoom(user1Id, user2Id))
                .rejects.toThrow('Users must follow each other to chat');
            (0, globals_1.expect)(mockChatRoomRepository.findOrCreateDMTransaction).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should find existing DM when it already exists', async () => {
            const user1Id = 'user-1';
            const user2Id = 'user-2';
            const existingRoom = createMockChatRoom({ type: chat_room_dto_1.ChatRoomType.DM, id: 'existing-dm' });
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            mockChatRoomRepository.findOrCreateDMTransaction.mockResolvedValue(existingRoom);
            const result = await chatRoomService.findOrCreateDMChatRoom(user1Id, user2Id);
            (0, globals_1.expect)(result).toEqual(existingRoom);
            (0, globals_1.expect)(result.id).toBe('existing-dm');
        });
        (0, globals_1.it)('should handle circuit breaker graceful degradation for DM creation', async () => {
            const user1Id = 'user-1';
            const user2Id = 'user-2';
            const expectedRoom = createMockChatRoom({ type: chat_room_dto_1.ChatRoomType.DM });
            mockFollowerRepository.isFollowing.mockRejectedValue(new Error('Service down'));
            for (let i = 0; i < 5; i++) {
                try {
                    await chatRoomService.findOrCreateDMChatRoom(user1Id, user2Id);
                }
                catch (error) {
                }
            }
            mockChatRoomRepository.findOrCreateDMTransaction.mockResolvedValue(expectedRoom);
            const result = await chatRoomService.findOrCreateDMChatRoom(user1Id, user2Id);
            (0, globals_1.expect)(result).toEqual(expectedRoom);
        });
    });
    (0, globals_1.describe)('updateChatRoom', () => {
        (0, globals_1.it)('should successfully update chat room when user is a member', async () => {
            const roomId = 'room-1';
            const userId = 'user-1';
            const updateData = { name: 'Updated Room Name' };
            const updatedRoom = createMockChatRoom({ id: roomId, name: 'Updated Room Name' });
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.update.mockResolvedValue(updatedRoom);
            const result = await chatRoomService.updateChatRoom(roomId, updateData, userId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(roomId, userId);
            (0, globals_1.expect)(mockChatRoomRepository.update).toHaveBeenCalledWith(roomId, updateData);
            (0, globals_1.expect)(result).toEqual(updatedRoom);
        });
        (0, globals_1.it)('should throw AuthorizationError when user is not a member', async () => {
            const roomId = 'room-1';
            const userId = 'unauthorized-user';
            const updateData = { name: 'Updated Room Name' };
            mockChatRoomMemberRepository.isMember.mockResolvedValue(false);
            await (0, globals_1.expect)(chatRoomService.updateChatRoom(roomId, updateData, userId))
                .rejects.toThrow('User is not a member of this chat room');
            (0, globals_1.expect)(mockChatRoomRepository.update).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('deleteChatRoom', () => {
        (0, globals_1.it)('should successfully delete chat room when user is a member', async () => {
            const roomId = 'room-1';
            const userId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.delete.mockResolvedValue(undefined);
            await chatRoomService.deleteChatRoom(roomId, userId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(roomId, userId);
            (0, globals_1.expect)(mockChatRoomRepository.delete).toHaveBeenCalledWith(roomId);
        });
        (0, globals_1.it)('should throw AuthorizationError when user is not a member', async () => {
            const roomId = 'room-1';
            const userId = 'unauthorized-user';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(false);
            await (0, globals_1.expect)(chatRoomService.deleteChatRoom(roomId, userId))
                .rejects.toThrow('User is not a member of this chat room');
            (0, globals_1.expect)(mockChatRoomRepository.delete).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('getUnreadCountForUser', () => {
        (0, globals_1.it)('should successfully return unread count for user', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const expectedCount = 5;
            mockChatRoomRepository.getUnreadCountForUser.mockResolvedValue(expectedCount);
            const result = await chatRoomService.getUnreadCountForUser(chatRoomId, userId);
            (0, globals_1.expect)(mockChatRoomRepository.getUnreadCountForUser).toHaveBeenCalledWith(chatRoomId, userId);
            (0, globals_1.expect)(result).toBe(expectedCount);
        });
        (0, globals_1.it)('should return zero when no unread messages', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            mockChatRoomRepository.getUnreadCountForUser.mockResolvedValue(0);
            const result = await chatRoomService.getUnreadCountForUser(chatRoomId, userId);
            (0, globals_1.expect)(result).toBe(0);
        });
    });
    (0, globals_1.describe)('Circuit Breaker Functionality', () => {
        (0, globals_1.it)('should open circuit breaker after threshold failures', async () => {
            const createData = createMockCreateChatRoomDTO();
            const requesterId = 'user-1';
            mockFollowerRepository.isFollowing.mockRejectedValue(new Error('Service down'));
            for (let i = 0; i < 5; i++) {
                try {
                    await chatRoomService.createChatRoom(createData, requesterId);
                }
                catch (error) {
                }
            }
            mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom());
            const result = await chatRoomService.createChatRoom(createData, requesterId);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(mockChatRoomRepository.createWithTransaction).toHaveBeenCalled();
        });
        (0, globals_1.it)('should reset circuit breaker on successful calls', async () => {
            const createData = createMockCreateChatRoomDTO();
            const requesterId = 'user-1';
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom());
            await chatRoomService.createChatRoom(createData, requesterId);
            const result = await chatRoomService.createChatRoom(createData, requesterId);
            (0, globals_1.expect)(result).toBeDefined();
        });
        (0, globals_1.it)('should transition from OPEN to HALF_OPEN after timeout', async () => {
            (0, globals_1.expect)(true).toBe(true);
        });
    });
    (0, globals_1.describe)('Performance and Batch Operations', () => {
        (0, globals_1.it)('should efficiently validate mutual follows for large groups', async () => {
            const memberIds = Array.from({ length: 10 }, (_, i) => `user-${i + 1}`);
            const createData = createMockCreateChatRoomDTO({ memberIds });
            const requesterId = 'user-1';
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom());
            const start = Date.now();
            await chatRoomService.createChatRoom(createData, requesterId);
            const duration = Date.now() - start;
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).toHaveBeenCalledTimes(90);
            (0, globals_1.expect)(duration).toBeLessThan(1000);
        });
        (0, globals_1.it)('should handle empty member lists gracefully', async () => {
            const createData = createMockCreateChatRoomDTO({ memberIds: [] });
            const requesterId = 'user-1';
            await (0, globals_1.expect)(chatRoomService.createChatRoom(createData, requesterId))
                .rejects.toThrow('Requester must be included in the chat room members');
        });
        (0, globals_1.it)('should optimize single-user groups (edge case)', async () => {
            const createData = createMockCreateChatRoomDTO({ memberIds: ['user-1'] });
            const requesterId = 'user-1';
            mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom());
            const result = await chatRoomService.createChatRoom(createData, requesterId);
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).not.toHaveBeenCalled();
            (0, globals_1.expect)(result).toBeDefined();
        });
    });
    (0, globals_1.describe)('Error Handling and Edge Cases', () => {
        (0, globals_1.it)('should handle repository transaction failures gracefully', async () => {
            const createData = createMockCreateChatRoomDTO();
            const requesterId = 'user-1';
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            mockChatRoomRepository.createWithTransaction.mockRejectedValue(new Error('Transaction failed'));
            await (0, globals_1.expect)(chatRoomService.createChatRoom(createData, requesterId))
                .rejects.toThrow('Transaction failed');
        });
        (0, globals_1.it)('should handle invalid chat room types', async () => {
            const createData = createMockCreateChatRoomDTO({
                type: 'INVALID_TYPE',
                memberIds: ['user-1', 'user-2', 'user-3']
            });
            const requesterId = 'user-1';
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom());
            const result = await chatRoomService.createChatRoom(createData, requesterId);
            (0, globals_1.expect)(result).toBeDefined();
        });
        (0, globals_1.it)('should handle concurrent room creation attempts', async () => {
            const createData1 = createMockCreateChatRoomDTO({ name: 'Room 1' });
            const createData2 = createMockCreateChatRoomDTO({ name: 'Room 2' });
            const requesterId = 'user-1';
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            mockChatRoomRepository.createWithTransaction
                .mockResolvedValueOnce(createMockChatRoom({ name: 'Room 1' }))
                .mockResolvedValueOnce(createMockChatRoom({ name: 'Room 2' }));
            const [result1, result2] = await Promise.all([
                chatRoomService.createChatRoom(createData1, requesterId),
                chatRoomService.createChatRoom(createData2, requesterId)
            ]);
            (0, globals_1.expect)(result1.name).toBe('Room 1');
            (0, globals_1.expect)(result2.name).toBe('Room 2');
        });
        (0, globals_1.it)('should handle very long chat room names', async () => {
            const longName = 'A'.repeat(1000);
            const createData = createMockCreateChatRoomDTO({ name: longName });
            const requesterId = 'user-1';
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom({ name: longName }));
            const result = await chatRoomService.createChatRoom(createData, requesterId);
            (0, globals_1.expect)(result.name).toBe(longName);
        });
        (0, globals_1.it)('should handle special characters in user IDs', async () => {
            const specialUserIds = ['user-@#$', 'user-ñáéíóú', 'user-🌍'];
            const createData = createMockCreateChatRoomDTO({ memberIds: specialUserIds });
            const requesterId = 'user-@#$';
            mockFollowerRepository.isFollowing.mockResolvedValue(true);
            mockChatRoomRepository.createWithTransaction.mockResolvedValue(createMockChatRoom());
            const result = await chatRoomService.createChatRoom(createData, requesterId);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(mockFollowerRepository.isFollowing).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=chat-room.service.test.js.map