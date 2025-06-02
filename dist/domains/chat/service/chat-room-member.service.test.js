"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chat_room_member_service_1 = require("./chat-room-member.service");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('ChatRoomMemberService', () => {
    let chatRoomMemberService;
    let mockChatRoomMemberRepository;
    let mockChatRoomRepository;
    const createMockChatRoomMember = (overrides = {}) => ({
        id: 'member-1',
        chatRoomId: 'room-1',
        userId: 'user-1',
        joinedAt: new Date(),
        lastReadAt: new Date(),
        ...overrides
    });
    const createMockAddMemberDTO = (overrides = {}) => ({
        chatRoomId: 'room-1',
        userId: 'user-2',
        ...overrides
    });
    const createMockUpdateLastReadDTO = (overrides = {}) => ({
        chatRoomId: 'room-1',
        userId: 'user-1',
        lastReadAt: new Date(),
        ...overrides
    });
    const createMockChatRoom = (overrides = {}) => ({
        id: 'room-1',
        name: 'Test Room',
        type: 'GROUP',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    });
    (0, globals_1.beforeEach)(() => {
        mockChatRoomMemberRepository = {
            addMember: globals_1.jest.fn(),
            removeMember: globals_1.jest.fn(),
            findByChatRoomId: globals_1.jest.fn(),
            findByUserId: globals_1.jest.fn(),
            isMember: globals_1.jest.fn(),
            updateLastRead: globals_1.jest.fn(),
            getMemberCount: globals_1.jest.fn()
        };
        mockChatRoomRepository = {
            findById: globals_1.jest.fn(),
            create: globals_1.jest.fn(),
            findByMemberId: globals_1.jest.fn(),
            findDMBetweenUsers: globals_1.jest.fn(),
            update: globals_1.jest.fn(),
            delete: globals_1.jest.fn(),
            createWithTransaction: globals_1.jest.fn(),
            findOrCreateDMTransaction: globals_1.jest.fn(),
            getUnreadCountForUser: globals_1.jest.fn()
        };
        globals_1.jest.clearAllMocks();
        chatRoomMemberService = new chat_room_member_service_1.ChatRoomMemberService(mockChatRoomMemberRepository, mockChatRoomRepository);
    });
    (0, globals_1.describe)('addMemberToChatRoom', () => {
        (0, globals_1.it)('should successfully add member when requester is authorized', async () => {
            const addMemberData = createMockAddMemberDTO();
            const requesterId = 'user-1';
            const expectedMember = createMockChatRoomMember(addMemberData);
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom());
            mockChatRoomMemberRepository.addMember.mockResolvedValue(expectedMember);
            const result = await chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(addMemberData.chatRoomId, requesterId);
            (0, globals_1.expect)(mockChatRoomRepository.findById).toHaveBeenCalledWith(addMemberData.chatRoomId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.addMember).toHaveBeenCalledWith(addMemberData);
            (0, globals_1.expect)(result).toEqual(expectedMember);
        });
        (0, globals_1.it)('should throw error when requester is not a member of the chat room', async () => {
            const addMemberData = createMockAddMemberDTO();
            const requesterId = 'unauthorized-user';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(false);
            await (0, globals_1.expect)(chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId))
                .rejects.toThrow('User is not a member of this chat room');
            (0, globals_1.expect)(mockChatRoomRepository.findById).not.toHaveBeenCalled();
            (0, globals_1.expect)(mockChatRoomMemberRepository.addMember).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw error when chat room does not exist', async () => {
            const addMemberData = createMockAddMemberDTO();
            const requesterId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.findById.mockResolvedValue(null);
            await (0, globals_1.expect)(chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId))
                .rejects.toThrow('Chat room not found');
            (0, globals_1.expect)(mockChatRoomMemberRepository.addMember).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle repository errors during member addition', async () => {
            const addMemberData = createMockAddMemberDTO();
            const requesterId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom());
            mockChatRoomMemberRepository.addMember.mockRejectedValue(new Error('Database constraint violation'));
            await (0, globals_1.expect)(chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId))
                .rejects.toThrow('Database constraint violation');
        });
        (0, globals_1.it)('should handle adding member who is already a member', async () => {
            const addMemberData = createMockAddMemberDTO();
            const requesterId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom());
            mockChatRoomMemberRepository.addMember.mockRejectedValue(new Error('User already a member'));
            await (0, globals_1.expect)(chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId))
                .rejects.toThrow('User already a member');
        });
    });
    (0, globals_1.describe)('removeMemberFromChatRoom', () => {
        (0, globals_1.it)('should successfully remove member when user removes themselves', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const requesterId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined);
            await chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(chatRoomId, requesterId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId);
        });
        (0, globals_1.it)('should throw error when requester is not a member', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-2';
            const requesterId = 'unauthorized-user';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(false);
            await (0, globals_1.expect)(chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId))
                .rejects.toThrow('User is not a member of this chat room');
            (0, globals_1.expect)(mockChatRoomMemberRepository.removeMember).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw error when trying to remove another user', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-2';
            const requesterId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            await (0, globals_1.expect)(chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId))
                .rejects.toThrow('You can only remove yourself from chat rooms');
            (0, globals_1.expect)(mockChatRoomMemberRepository.removeMember).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle repository errors during member removal', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const requesterId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomMemberRepository.removeMember.mockRejectedValue(new Error('Database error'));
            await (0, globals_1.expect)(chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId))
                .rejects.toThrow('Database error');
        });
        (0, globals_1.it)('should handle removing non-existent member gracefully', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const requesterId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined);
            await chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId);
        });
    });
    (0, globals_1.describe)('getChatRoomMembers', () => {
        (0, globals_1.it)('should successfully retrieve members when requester is authorized', async () => {
            const chatRoomId = 'room-1';
            const requesterId = 'user-1';
            const expectedMembers = [
                createMockChatRoomMember({ userId: 'user-1' }),
                createMockChatRoomMember({ userId: 'user-2', id: 'member-2' })
            ];
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomMemberRepository.findByChatRoomId.mockResolvedValue(expectedMembers);
            const result = await chatRoomMemberService.getChatRoomMembers(chatRoomId, requesterId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(chatRoomId, requesterId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.findByChatRoomId).toHaveBeenCalledWith(chatRoomId);
            (0, globals_1.expect)(result).toEqual(expectedMembers);
            (0, globals_1.expect)(result).toHaveLength(2);
        });
        (0, globals_1.it)('should throw error when requester is not a member', async () => {
            const chatRoomId = 'room-1';
            const requesterId = 'unauthorized-user';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(false);
            await (0, globals_1.expect)(chatRoomMemberService.getChatRoomMembers(chatRoomId, requesterId))
                .rejects.toThrow('User is not a member of this chat room');
            (0, globals_1.expect)(mockChatRoomMemberRepository.findByChatRoomId).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should return empty array when chat room has no members', async () => {
            const chatRoomId = 'empty-room';
            const requesterId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomMemberRepository.findByChatRoomId.mockResolvedValue([]);
            const result = await chatRoomMemberService.getChatRoomMembers(chatRoomId, requesterId);
            (0, globals_1.expect)(result).toEqual([]);
        });
        (0, globals_1.it)('should handle repository errors gracefully', async () => {
            const chatRoomId = 'room-1';
            const requesterId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomMemberRepository.findByChatRoomId.mockRejectedValue(new Error('Database connection lost'));
            await (0, globals_1.expect)(chatRoomMemberService.getChatRoomMembers(chatRoomId, requesterId))
                .rejects.toThrow('Database connection lost');
        });
        (0, globals_1.it)('should handle large member lists efficiently', async () => {
            const chatRoomId = 'large-room';
            const requesterId = 'user-1';
            const largeMembers = Array.from({ length: 1000 }, (_, i) => createMockChatRoomMember({ userId: `user-${i}`, id: `member-${i}` }));
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomMemberRepository.findByChatRoomId.mockResolvedValue(largeMembers);
            const start = Date.now();
            const result = await chatRoomMemberService.getChatRoomMembers(chatRoomId, requesterId);
            const duration = Date.now() - start;
            (0, globals_1.expect)(result).toHaveLength(1000);
            (0, globals_1.expect)(duration).toBeLessThan(100);
        });
    });
    (0, globals_1.describe)('updateLastRead', () => {
        (0, globals_1.it)('should successfully update last read timestamp', async () => {
            const updateData = createMockUpdateLastReadDTO();
            const expectedUpdatedMember = createMockChatRoomMember({ lastReadAt: updateData.lastReadAt });
            mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedUpdatedMember);
            const result = await chatRoomMemberService.updateLastRead(updateData);
            (0, globals_1.expect)(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData);
            (0, globals_1.expect)(result).toEqual(expectedUpdatedMember);
        });
        (0, globals_1.it)('should handle repository errors during update', async () => {
            const updateData = createMockUpdateLastReadDTO();
            mockChatRoomMemberRepository.updateLastRead.mockRejectedValue(new Error('Update failed'));
            await (0, globals_1.expect)(chatRoomMemberService.updateLastRead(updateData))
                .rejects.toThrow('Update failed');
        });
        (0, globals_1.it)('should handle updating last read for non-existent member', async () => {
            const updateData = createMockUpdateLastReadDTO({ userId: 'non-existent-user' });
            const expectedUpdatedMember = createMockChatRoomMember({ userId: 'non-existent-user', lastReadAt: updateData.lastReadAt });
            mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedUpdatedMember);
            const result = await chatRoomMemberService.updateLastRead(updateData);
            (0, globals_1.expect)(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData);
            (0, globals_1.expect)(result).toEqual(expectedUpdatedMember);
        });
        (0, globals_1.it)('should handle future timestamps correctly', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const updateData = createMockUpdateLastReadDTO({ lastReadAt: futureDate });
            const expectedUpdatedMember = createMockChatRoomMember({ lastReadAt: futureDate });
            mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedUpdatedMember);
            const result = await chatRoomMemberService.updateLastRead(updateData);
            (0, globals_1.expect)(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData);
            (0, globals_1.expect)(result).toEqual(expectedUpdatedMember);
        });
        (0, globals_1.it)('should handle concurrent last read updates', async () => {
            const updateData1 = createMockUpdateLastReadDTO({ userId: 'user-1' });
            const updateData2 = createMockUpdateLastReadDTO({ userId: 'user-2' });
            const expectedMember1 = createMockChatRoomMember({ userId: 'user-1', lastReadAt: updateData1.lastReadAt });
            const expectedMember2 = createMockChatRoomMember({ userId: 'user-2', lastReadAt: updateData2.lastReadAt });
            mockChatRoomMemberRepository.updateLastRead
                .mockResolvedValueOnce(expectedMember1)
                .mockResolvedValueOnce(expectedMember2);
            const [result1, result2] = await Promise.all([
                chatRoomMemberService.updateLastRead(updateData1),
                chatRoomMemberService.updateLastRead(updateData2)
            ]);
            (0, globals_1.expect)(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData1);
            (0, globals_1.expect)(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData2);
            (0, globals_1.expect)(result1).toEqual(expectedMember1);
            (0, globals_1.expect)(result2).toEqual(expectedMember2);
        });
        (0, globals_1.it)('should not allow concurrent modifications to the same member record', async () => {
            const updateData = createMockUpdateLastReadDTO({ userId: 'user-1' });
            const updateDataConflict = createMockUpdateLastReadDTO({ userId: 'user-1', lastReadAt: new Date(Date.now() + 10000) });
            const expectedMember = createMockChatRoomMember({ userId: 'user-1', lastReadAt: updateData.lastReadAt });
            const expectedMemberConflict = createMockChatRoomMember({ userId: 'user-1', lastReadAt: updateDataConflict.lastReadAt });
            mockChatRoomMemberRepository.updateLastRead
                .mockResolvedValueOnce(expectedMember)
                .mockResolvedValueOnce(expectedMemberConflict);
            const result = await chatRoomMemberService.updateLastRead(updateData);
            (0, globals_1.expect)(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData);
            (0, globals_1.expect)(result).toEqual(expectedMember);
            const result2 = await chatRoomMemberService.updateLastRead(updateDataConflict);
            (0, globals_1.expect)(result2).toEqual(expectedMemberConflict);
        });
    });
    (0, globals_1.describe)('leaveChatRoom', () => {
        (0, globals_1.it)('should successfully remove user from chat room', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined);
            await chatRoomMemberService.leaveChatRoom(chatRoomId, userId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId);
        });
        (0, globals_1.it)('should handle repository errors during leave operation', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            mockChatRoomMemberRepository.removeMember.mockRejectedValue(new Error('Cannot leave room'));
            await (0, globals_1.expect)(chatRoomMemberService.leaveChatRoom(chatRoomId, userId))
                .rejects.toThrow('Cannot leave room');
        });
        (0, globals_1.it)('should handle leaving room user is not a member of', async () => {
            const chatRoomId = 'room-1';
            const userId = 'non-member-user';
            mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined);
            await chatRoomMemberService.leaveChatRoom(chatRoomId, userId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId);
        });
        (0, globals_1.it)('should handle concurrent leave operations', async () => {
            const chatRoomId = 'room-1';
            const userId1 = 'user-1';
            const userId2 = 'user-2';
            mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined);
            await Promise.all([
                chatRoomMemberService.leaveChatRoom(chatRoomId, userId1),
                chatRoomMemberService.leaveChatRoom(chatRoomId, userId2)
            ]);
            (0, globals_1.expect)(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId1);
            (0, globals_1.expect)(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId2);
        });
    });
    (0, globals_1.describe)('Edge Cases and Security', () => {
        (0, globals_1.it)('should handle empty string IDs gracefully', async () => {
            const addMemberData = createMockAddMemberDTO({ chatRoomId: '', userId: '' });
            const requesterId = '';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom());
            mockChatRoomMemberRepository.addMember.mockResolvedValue(createMockChatRoomMember());
            const result = await chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId);
            (0, globals_1.expect)(result).toBeDefined();
        });
        (0, globals_1.it)('should handle very long user IDs', async () => {
            const longUserId = 'u'.repeat(1000);
            const longChatRoomId = 'r'.repeat(1000);
            const addMemberData = createMockAddMemberDTO({
                chatRoomId: longChatRoomId,
                userId: longUserId
            });
            const requesterId = longUserId;
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom());
            mockChatRoomMemberRepository.addMember.mockResolvedValue(createMockChatRoomMember());
            const result = await chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId);
            (0, globals_1.expect)(result).toBeDefined();
        });
        (0, globals_1.it)('should handle special characters in IDs', async () => {
            const specialUserId = 'user-@#$%^&*()';
            const specialChatRoomId = 'room-ñáéíóú🌍';
            const addMemberData = createMockAddMemberDTO({
                chatRoomId: specialChatRoomId,
                userId: specialUserId
            });
            const requesterId = specialUserId;
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom());
            mockChatRoomMemberRepository.addMember.mockResolvedValue(createMockChatRoomMember());
            const result = await chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId);
            (0, globals_1.expect)(result).toBeDefined();
        });
        (0, globals_1.it)('should handle duplicate member addition gracefully', async () => {
            const addMemberData = createMockAddMemberDTO();
            const requesterId = 'user-1';
            const fixedDate = new Date('2025-06-02T13:41:20.948Z');
            const mockMember = {
                id: 'member-1',
                chatRoomId: 'room-1',
                userId: 'user-2',
                joinedAt: fixedDate,
                lastReadAt: fixedDate
            };
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom());
            mockChatRoomMemberRepository.addMember.mockResolvedValue(mockMember);
            const result = await chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.addMember).toHaveBeenCalledWith(addMemberData);
            (0, globals_1.expect)(result).toEqual(mockMember);
        });
        (0, globals_1.it)('should not allow unauthorized member addition', async () => {
            const addMemberData = createMockAddMemberDTO();
            const requesterId = 'unauthorized-user';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(false);
            await (0, globals_1.expect)(chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId))
                .rejects.toThrow('User is not a member of this chat room');
            (0, globals_1.expect)(mockChatRoomMemberRepository.addMember).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should not allow addition to non-existent chat room', async () => {
            const addMemberData = createMockAddMemberDTO();
            const requesterId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.findById.mockResolvedValue(null);
            await (0, globals_1.expect)(chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId))
                .rejects.toThrow('Chat room not found');
            (0, globals_1.expect)(mockChatRoomMemberRepository.addMember).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle re-adding removed members correctly', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const requesterId = 'user-2';
            const addMemberData = createMockAddMemberDTO({ chatRoomId, userId });
            const fixedDate = new Date();
            const mockMember = {
                id: 'member-1',
                chatRoomId,
                userId,
                joinedAt: fixedDate,
                lastReadAt: fixedDate
            };
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomRepository.findById.mockResolvedValue(createMockChatRoom());
            mockChatRoomMemberRepository.addMember.mockResolvedValue(mockMember);
            const result = await chatRoomMemberService.addMemberToChatRoom(addMemberData, requesterId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.addMember).toHaveBeenCalledWith(addMemberData);
            (0, globals_1.expect)(result).toEqual(mockMember);
        });
        (0, globals_1.it)('should not allow self-removal from non-member state', async () => {
            const chatRoomId = 'room-1';
            const userId = 'non-member-user';
            const requesterId = 'non-member-user';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(false);
            await (0, globals_1.expect)(chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId))
                .rejects.toThrow('User is not a member of this chat room');
        });
        (0, globals_1.it)('should not allow removal of non-existent members', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-1';
            const requesterId = 'user-1';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined);
            await chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId);
        });
        (0, globals_1.it)('should not allow concurrent modifications to the same member record', async () => {
            const updateData = createMockUpdateLastReadDTO({ userId: 'user-1' });
            const updateDataConflict = createMockUpdateLastReadDTO({ userId: 'user-1', lastReadAt: new Date(Date.now() + 10000) });
            const expectedMember = createMockChatRoomMember({ userId: 'user-1', lastReadAt: updateData.lastReadAt });
            const expectedMemberConflict = createMockChatRoomMember({ userId: 'user-1', lastReadAt: updateDataConflict.lastReadAt });
            mockChatRoomMemberRepository.updateLastRead
                .mockResolvedValueOnce(expectedMember)
                .mockResolvedValueOnce(expectedMemberConflict);
            const result = await chatRoomMemberService.updateLastRead(updateData);
            (0, globals_1.expect)(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith(updateData);
            (0, globals_1.expect)(result).toEqual(expectedMember);
            const result2 = await chatRoomMemberService.updateLastRead(updateDataConflict);
            (0, globals_1.expect)(result2).toEqual(expectedMemberConflict);
        });
        (0, globals_1.it)('should not allow removal of members with active admin roles', async () => {
            const chatRoomId = 'room-1';
            const userId = 'admin-user';
            const requesterId = 'admin-user';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockChatRoomMemberRepository.removeMember.mockRejectedValue(new Error('Cannot remove admin'));
            await (0, globals_1.expect)(chatRoomMemberService.removeMemberFromChatRoom(chatRoomId, userId, requesterId))
                .rejects.toThrow('Cannot remove admin');
        });
        (0, globals_1.it)('should not allow unauthorized leave requests', async () => {
            const chatRoomId = 'room-1';
            const userId = 'user-2';
            mockChatRoomMemberRepository.removeMember.mockResolvedValue(undefined);
            await chatRoomMemberService.leaveChatRoom(chatRoomId, userId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.removeMember).toHaveBeenCalledWith(chatRoomId, userId);
        });
        (0, globals_1.it)('should not allow leaving a chat room with active admin roles', async () => {
            const chatRoomId = 'room-1';
            const userId = 'admin-user';
            mockChatRoomMemberRepository.removeMember.mockRejectedValue(new Error('Cannot leave admin role'));
            await (0, globals_1.expect)(chatRoomMemberService.leaveChatRoom(chatRoomId, userId))
                .rejects.toThrow('Cannot leave admin role');
        });
    });
});
//# sourceMappingURL=chat-room-member.service.test.js.map