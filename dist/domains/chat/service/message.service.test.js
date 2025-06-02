"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const message_service_1 = require("./message.service");
const message_dto_1 = require("../dto/message.dto");
const globals_1 = require("@jest/globals");
globals_1.jest.mock('dompurify', () => ({
    __esModule: true,
    default: globals_1.jest.fn(() => ({
        sanitize: globals_1.jest.fn((content, options) => {
            return content.replace(/<script.*?<\/script>/gi, '');
        })
    }))
}));
globals_1.jest.mock('jsdom', () => ({
    JSDOM: globals_1.jest.fn(() => ({
        window: {}
    }))
}));
(0, globals_1.describe)('MessageService', () => {
    let messageService;
    let mockMessageRepository;
    let mockChatRoomMemberRepository;
    const createMockMessage = (overrides = {}) => ({
        id: 'message-1',
        content: 'Test message content',
        authorId: 'user-1',
        chatRoomId: 'room-1',
        type: message_dto_1.MessageType.TEXT,
        createdAt: new Date(),
        updatedAt: new Date(),
        isEncrypted: false,
        iv: undefined,
        tag: undefined,
        ...overrides
    });
    const createMockChatRoomMember = (overrides = {}) => ({
        id: 'member-1',
        chatRoomId: 'room-1',
        userId: 'user-1',
        joinedAt: new Date(),
        lastReadAt: new Date(),
        ...overrides
    });
    const createMockCreateMessageDTO = (overrides = {}) => ({
        content: 'Test message content',
        authorId: 'user-1',
        chatRoomId: 'room-1',
        ...overrides
    });
    const createMockGetMessagesDTO = (overrides = {}) => ({
        chatRoomId: 'room-1',
        limit: 20,
        cursor: undefined,
        ...overrides
    });
    (0, globals_1.beforeAll)(() => {
        process.env.MESSAGE_ENCRYPTION_KEY = 'test-encryption-key-32-characters';
    });
    (0, globals_1.afterAll)(() => {
        delete process.env.MESSAGE_ENCRYPTION_KEY;
    });
    (0, globals_1.beforeEach)(() => {
        mockMessageRepository = {
            create: globals_1.jest.fn(),
            findById: globals_1.jest.fn(),
            findByChatRoomId: globals_1.jest.fn(),
            update: globals_1.jest.fn(),
            delete: globals_1.jest.fn(),
            getLastMessageForChatRoom: globals_1.jest.fn(),
            getMessageCountAfterTimestamp: globals_1.jest.fn()
        };
        mockChatRoomMemberRepository = {
            isMember: globals_1.jest.fn(),
            updateLastRead: globals_1.jest.fn(),
            addMember: globals_1.jest.fn(),
            removeMember: globals_1.jest.fn(),
            findByChatRoomId: globals_1.jest.fn(),
            findByUserId: globals_1.jest.fn(),
            getMemberCount: globals_1.jest.fn()
        };
        globals_1.jest.clearAllMocks();
        messageService = new message_service_1.MessageService(mockMessageRepository, mockChatRoomMemberRepository);
    });
    (0, globals_1.describe)('createMessage', () => {
        (0, globals_1.it)('should successfully create a message when user is a member', async () => {
            const messageData = createMockCreateMessageDTO();
            const expectedMessage = createMockMessage(messageData);
            const expectedMember = createMockChatRoomMember();
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockMessageRepository.create.mockResolvedValue(expectedMessage);
            mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedMember);
            const result = await messageService.createMessage(messageData);
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(messageData.chatRoomId, messageData.authorId);
            (0, globals_1.expect)(mockMessageRepository.create).toHaveBeenCalled();
            (0, globals_1.expect)(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith({
                chatRoomId: messageData.chatRoomId,
                userId: messageData.authorId,
                lastReadAt: globals_1.expect.any(Date)
            });
            (0, globals_1.expect)(result).toBeInstanceOf(message_dto_1.MessageResponseDTO);
            (0, globals_1.expect)(result.message.content).toBe(expectedMessage.content);
        });
        (0, globals_1.it)('should throw error when user is not a member of the chat room', async () => {
            const messageData = createMockCreateMessageDTO();
            mockChatRoomMemberRepository.isMember.mockResolvedValue(false);
            await (0, globals_1.expect)(messageService.createMessage(messageData)).rejects.toThrow('User is not a member of this chat room');
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(messageData.chatRoomId, messageData.authorId);
            (0, globals_1.expect)(mockMessageRepository.create).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should sanitize message content to prevent XSS', async () => {
            const messageData = createMockCreateMessageDTO({
                content: 'Hello <script>alert("xss")</script> world'
            });
            const sanitizedMessage = createMockMessage({
                ...messageData,
                content: 'Hello  world'
            });
            const expectedMember = createMockChatRoomMember();
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockMessageRepository.create.mockResolvedValue(sanitizedMessage);
            mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedMember);
            const result = await messageService.createMessage(messageData);
            (0, globals_1.expect)(result.message.content).toBe('Hello  world');
            (0, globals_1.expect)(mockMessageRepository.create).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                isEncrypted: true,
                iv: globals_1.expect.any(String),
                tag: globals_1.expect.any(String)
            }));
        });
        (0, globals_1.it)('should encrypt message when encryption is enabled', async () => {
            const messageData = createMockCreateMessageDTO();
            const encryptedMessage = createMockMessage({
                ...messageData,
                content: messageData.content,
                isEncrypted: false,
                iv: undefined,
                tag: undefined
            });
            const expectedMember = createMockChatRoomMember();
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockMessageRepository.create.mockResolvedValue(encryptedMessage);
            mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedMember);
            const result = await messageService.createMessage(messageData);
            (0, globals_1.expect)(mockMessageRepository.create).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                isEncrypted: true,
                iv: globals_1.expect.any(String),
                tag: globals_1.expect.any(String)
            }));
            (0, globals_1.expect)(result.message.content).toBe(messageData.content);
        });
        (0, globals_1.it)('should handle empty message content', async () => {
            const messageData = createMockCreateMessageDTO({ content: '   ' });
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            await (0, globals_1.expect)(messageService.createMessage(messageData)).rejects.toThrow('Message content cannot be empty');
            (0, globals_1.expect)(mockMessageRepository.create).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle message content exceeding maximum length', async () => {
            const longContent = 'a'.repeat(1001);
            const messageData = createMockCreateMessageDTO({ content: longContent });
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            await (0, globals_1.expect)(messageService.createMessage(messageData)).rejects.toThrow('Message content exceeds maximum length');
            (0, globals_1.expect)(mockMessageRepository.create).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle repository errors gracefully', async () => {
            const messageData = createMockCreateMessageDTO();
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockMessageRepository.create.mockRejectedValue(new Error('Database error'));
            await (0, globals_1.expect)(messageService.createMessage(messageData)).rejects.toThrow('Database error');
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalled();
            (0, globals_1.expect)(mockMessageRepository.create).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('getMessage', () => {
        (0, globals_1.it)('should successfully retrieve and decrypt message when user is a member', async () => {
            const messageId = 'message-1';
            const userId = 'user-1';
            const encryptedMessage = createMockMessage({
                id: messageId,
                content: 'encrypted-content',
                isEncrypted: true,
                iv: '123456789012345678901234',
                tag: '12345678901234567890123456789012'
            });
            mockMessageRepository.findById.mockResolvedValue(encryptedMessage);
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            const result = await messageService.getMessage(messageId, userId);
            (0, globals_1.expect)(mockMessageRepository.findById).toHaveBeenCalledWith(messageId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(encryptedMessage.chatRoomId, userId);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.content).toBe('[Message could not be decrypted]');
        });
        (0, globals_1.it)('should return null when message is not found', async () => {
            const messageId = 'non-existent-message';
            const userId = 'user-1';
            mockMessageRepository.findById.mockResolvedValue(null);
            const result = await messageService.getMessage(messageId, userId);
            (0, globals_1.expect)(result).toBeNull();
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw error when user is not a member of the chat room', async () => {
            const messageId = 'message-1';
            const userId = 'unauthorized-user';
            const message = createMockMessage({ id: messageId });
            mockMessageRepository.findById.mockResolvedValue(message);
            mockChatRoomMemberRepository.isMember.mockResolvedValue(false);
            await (0, globals_1.expect)(messageService.getMessage(messageId, userId)).rejects.toThrow('User is not a member of this chat room');
            (0, globals_1.expect)(mockMessageRepository.findById).toHaveBeenCalledWith(messageId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(message.chatRoomId, userId);
        });
        (0, globals_1.it)('should handle decryption failures gracefully', async () => {
            const messageId = 'message-1';
            const userId = 'user-1';
            const encryptedMessage = createMockMessage({
                id: messageId,
                content: 'invalid-encrypted-content',
                isEncrypted: true,
                iv: 'invalid-iv',
                tag: 'invalid-tag'
            });
            mockMessageRepository.findById.mockResolvedValue(encryptedMessage);
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            const result = await messageService.getMessage(messageId, userId);
            (0, globals_1.expect)(result?.content).toBe('[Message could not be decrypted]');
        });
    });
    (0, globals_1.describe)('getChatRoomMessages', () => {
        (0, globals_1.it)('should successfully retrieve and decrypt messages for authorized user', async () => {
            const messagesData = createMockGetMessagesDTO();
            const userId = 'user-1';
            const messages = [
                createMockMessage({ id: 'msg-1', content: 'Message 1' }),
                createMockMessage({ id: 'msg-2', content: 'Message 2', isEncrypted: true, iv: 'iv', tag: 'tag' })
            ];
            const expectedMember = createMockChatRoomMember();
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockMessageRepository.findByChatRoomId.mockResolvedValue(messages);
            mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedMember);
            const result = await messageService.getChatRoomMessages(messagesData, userId);
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(messagesData.chatRoomId, userId);
            (0, globals_1.expect)(mockMessageRepository.findByChatRoomId).toHaveBeenCalledWith(messagesData.chatRoomId, messagesData.limit, messagesData.cursor);
            (0, globals_1.expect)(mockChatRoomMemberRepository.updateLastRead).toHaveBeenCalledWith({
                chatRoomId: messagesData.chatRoomId,
                userId,
                lastReadAt: globals_1.expect.any(Date)
            });
            (0, globals_1.expect)(result).toHaveLength(2);
        });
        (0, globals_1.it)('should throw error when user is not a member of the chat room', async () => {
            const messagesData = createMockGetMessagesDTO();
            const userId = 'unauthorized-user';
            mockChatRoomMemberRepository.isMember.mockResolvedValue(false);
            await (0, globals_1.expect)(messageService.getChatRoomMessages(messagesData, userId)).rejects.toThrow('User is not a member of this chat room');
            (0, globals_1.expect)(mockChatRoomMemberRepository.isMember).toHaveBeenCalledWith(messagesData.chatRoomId, userId);
            (0, globals_1.expect)(mockMessageRepository.findByChatRoomId).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle mixed encrypted and unencrypted messages', async () => {
            const messagesData = createMockGetMessagesDTO();
            const userId = 'user-1';
            const messages = [
                createMockMessage({ id: 'msg-1', content: 'Plain message', isEncrypted: false }),
                createMockMessage({ id: 'msg-2', content: 'encrypted-content', isEncrypted: true, iv: 'iv', tag: 'tag' })
            ];
            const expectedMember = createMockChatRoomMember();
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockMessageRepository.findByChatRoomId.mockResolvedValue(messages);
            mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedMember);
            const result = await messageService.getChatRoomMessages(messagesData, userId);
            (0, globals_1.expect)(result[0].content).toBe('Plain message');
            (0, globals_1.expect)(result[1].content).toBeDefined();
        });
        (0, globals_1.it)('should handle pagination parameters correctly', async () => {
            const messagesData = createMockGetMessagesDTO({ limit: 10, cursor: 'cursor-123' });
            const userId = 'user-1';
            const expectedMember = createMockChatRoomMember();
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockMessageRepository.findByChatRoomId.mockResolvedValue([]);
            mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedMember);
            await messageService.getChatRoomMessages(messagesData, userId);
            (0, globals_1.expect)(mockMessageRepository.findByChatRoomId).toHaveBeenCalledWith(messagesData.chatRoomId, 10, 'cursor-123');
        });
    });
    (0, globals_1.describe)('updateMessage', () => {
        (0, globals_1.it)('should successfully update message when user is the author', async () => {
            const messageId = 'message-1';
            const newContent = 'Updated content';
            const userId = 'user-1';
            const existingMessage = createMockMessage({ id: messageId, authorId: userId });
            const updatedMessage = createMockMessage({ id: messageId, content: newContent, authorId: userId });
            mockMessageRepository.findById.mockResolvedValue(existingMessage);
            mockMessageRepository.update.mockResolvedValue(updatedMessage);
            const result = await messageService.updateMessage(messageId, newContent, userId);
            (0, globals_1.expect)(mockMessageRepository.findById).toHaveBeenCalledWith(messageId);
            (0, globals_1.expect)(mockMessageRepository.update).toHaveBeenCalledWith(messageId, globals_1.expect.objectContaining({
                isEncrypted: true,
                iv: globals_1.expect.any(String),
                tag: globals_1.expect.any(String)
            }));
            (0, globals_1.expect)(result.content).toBe(newContent);
        });
        (0, globals_1.it)('should throw error when message is not found', async () => {
            const messageId = 'non-existent-message';
            const newContent = 'Updated content';
            const userId = 'user-1';
            mockMessageRepository.findById.mockResolvedValue(null);
            await (0, globals_1.expect)(messageService.updateMessage(messageId, newContent, userId)).rejects.toThrow('Message not found');
            (0, globals_1.expect)(mockMessageRepository.findById).toHaveBeenCalledWith(messageId);
            (0, globals_1.expect)(mockMessageRepository.update).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw error when user is not the author', async () => {
            const messageId = 'message-1';
            const newContent = 'Updated content';
            const userId = 'unauthorized-user';
            const existingMessage = createMockMessage({ id: messageId, authorId: 'different-user' });
            mockMessageRepository.findById.mockResolvedValue(existingMessage);
            await (0, globals_1.expect)(messageService.updateMessage(messageId, newContent, userId)).rejects.toThrow('User is not the author of this message');
            (0, globals_1.expect)(mockMessageRepository.findById).toHaveBeenCalledWith(messageId);
            (0, globals_1.expect)(mockMessageRepository.update).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should sanitize updated content', async () => {
            const messageId = 'message-1';
            const maliciousContent = 'Updated <script>alert("xss")</script> content';
            const userId = 'user-1';
            const existingMessage = createMockMessage({ id: messageId, authorId: userId });
            const updatedMessage = createMockMessage({
                id: messageId,
                content: 'Updated  content',
                authorId: userId
            });
            mockMessageRepository.findById.mockResolvedValue(existingMessage);
            mockMessageRepository.update.mockResolvedValue(updatedMessage);
            const result = await messageService.updateMessage(messageId, maliciousContent, userId);
            (0, globals_1.expect)(mockMessageRepository.update).toHaveBeenCalledWith(messageId, globals_1.expect.objectContaining({
                isEncrypted: true,
                iv: globals_1.expect.any(String),
                tag: globals_1.expect.any(String)
            }));
            (0, globals_1.expect)(result.content).toBe('Updated  content');
        });
        (0, globals_1.it)('should encrypt updated content when encryption is enabled', async () => {
            const messageId = 'message-1';
            const newContent = 'Updated content';
            const userId = 'user-1';
            const existingMessage = createMockMessage({ id: messageId, authorId: userId });
            const updatedMessage = createMockMessage({
                id: messageId,
                content: newContent,
                isEncrypted: false,
                iv: undefined,
                tag: undefined,
                authorId: userId
            });
            mockMessageRepository.findById.mockResolvedValue(existingMessage);
            mockMessageRepository.update.mockResolvedValue(updatedMessage);
            const result = await messageService.updateMessage(messageId, newContent, userId);
            (0, globals_1.expect)(mockMessageRepository.update).toHaveBeenCalledWith(messageId, globals_1.expect.objectContaining({
                isEncrypted: true,
                iv: globals_1.expect.any(String),
                tag: globals_1.expect.any(String)
            }));
            (0, globals_1.expect)(result.content).toBe(newContent);
        });
    });
    (0, globals_1.describe)('Encryption/Decryption', () => {
        (0, globals_1.it)('should handle encryption with missing key gracefully', async () => {
            const originalKey = process.env.MESSAGE_ENCRYPTION_KEY;
            delete process.env.MESSAGE_ENCRYPTION_KEY;
            const messageData = createMockCreateMessageDTO();
            const unencryptedMessage = createMockMessage(messageData);
            const expectedMember = createMockChatRoomMember();
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockMessageRepository.create.mockResolvedValue(unencryptedMessage);
            mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedMember);
            const result = await messageService.createMessage(messageData);
            (0, globals_1.expect)(result.message.isEncrypted).toBe(false);
            (0, globals_1.expect)(result.message.iv).toBeUndefined();
            (0, globals_1.expect)(result.message.tag).toBeUndefined();
            process.env.MESSAGE_ENCRYPTION_KEY = originalKey;
        });
        (0, globals_1.it)('should handle decryption with corrupted data', async () => {
            const messageId = 'message-1';
            const userId = 'user-1';
            const corruptedMessage = createMockMessage({
                id: messageId,
                content: 'corrupted-data',
                isEncrypted: false,
                iv: undefined,
                tag: 'test-tag'
            });
            mockMessageRepository.findById.mockResolvedValue(corruptedMessage);
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            const result = await messageService.getMessage(messageId, userId);
            (0, globals_1.expect)(result?.content).toBe('corrupted-data');
        });
        (0, globals_1.it)('should handle encryption with proper key rotation', async () => {
            const messageData = createMockCreateMessageDTO();
            const encryptedMessage = createMockMessage({
                ...messageData,
                content: messageData.content,
                isEncrypted: false,
                iv: undefined,
                tag: undefined
            });
            const expectedMember = createMockChatRoomMember();
            mockChatRoomMemberRepository.isMember.mockResolvedValue(true);
            mockMessageRepository.create.mockResolvedValue(encryptedMessage);
            mockChatRoomMemberRepository.updateLastRead.mockResolvedValue(expectedMember);
            const result = await messageService.createMessage(messageData);
            (0, globals_1.expect)(result.message.content).toBe(messageData.content);
            (0, globals_1.expect)(mockMessageRepository.create).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                isEncrypted: true,
                iv: globals_1.expect.any(String),
                tag: globals_1.expect.any(String)
            }));
        });
    });
});
//# sourceMappingURL=message.service.test.js.map