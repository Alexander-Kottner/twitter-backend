"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const message_dto_1 = require("../dto/message.dto");
const dompurify_1 = __importDefault(require("dompurify"));
const jsdom_1 = require("jsdom");
const crypto_1 = __importDefault(require("crypto"));
const window = new jsdom_1.JSDOM('').window;
const purify = (0, dompurify_1.default)(window);
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_DERIVATION_ITERATIONS = 100000;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
class MessageService {
    messageRepository;
    chatRoomMemberRepository;
    constructor(messageRepository, chatRoomMemberRepository) {
        this.messageRepository = messageRepository;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        if (!process.env.MESSAGE_ENCRYPTION_KEY) {
            console.warn('MESSAGE_ENCRYPTION_KEY not configured - messages will not be encrypted');
        }
    }
    encryptMessage(content, chatRoomId) {
        if (!process.env.MESSAGE_ENCRYPTION_KEY) {
            throw new Error('Message encryption not configured');
        }
        try {
            const key = this.deriveRoomKey(chatRoomId);
            const iv = crypto_1.default.randomBytes(IV_LENGTH);
            const cipher = crypto_1.default.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
            cipher.setAAD(Buffer.from(chatRoomId));
            let encrypted = cipher.update(content, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const tag = cipher.getAuthTag();
            return {
                encryptedContent: encrypted,
                iv: iv.toString('hex'),
                tag: tag.toString('hex')
            };
        }
        catch (error) {
            console.error('Message encryption failed:', error);
            throw new Error('Failed to encrypt message');
        }
    }
    decryptMessage(encryptedContent, iv, tag, chatRoomId) {
        if (!process.env.MESSAGE_ENCRYPTION_KEY) {
            throw new Error('Message encryption not configured');
        }
        try {
            const key = this.deriveRoomKey(chatRoomId);
            const decipher = crypto_1.default.createDecipheriv(ENCRYPTION_ALGORITHM, key, Buffer.from(iv, 'hex'));
            decipher.setAAD(Buffer.from(chatRoomId));
            decipher.setAuthTag(Buffer.from(tag, 'hex'));
            let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            console.error('Message decryption failed:', error);
            throw new Error('Failed to decrypt message');
        }
    }
    deriveRoomKey(chatRoomId) {
        const masterKey = process.env.MESSAGE_ENCRYPTION_KEY;
        const salt = Buffer.from(chatRoomId + 'chat_encryption_salt');
        return crypto_1.default.pbkdf2Sync(masterKey, salt, KEY_DERIVATION_ITERATIONS, 32, 'sha256');
    }
    shouldEncryptMessage() {
        return Boolean(process.env.MESSAGE_ENCRYPTION_KEY);
    }
    async createMessage(data) {
        await this.validateMembership(data.chatRoomId, data.authorId);
        const sanitizedContent = this.sanitizeContent(data.content);
        let finalData = {
            ...data,
            content: sanitizedContent
        };
        if (this.shouldEncryptMessage()) {
            const { encryptedContent, iv, tag } = this.encryptMessage(sanitizedContent, data.chatRoomId);
            finalData = {
                ...finalData,
                content: encryptedContent,
                iv,
                tag,
                isEncrypted: true
            };
        }
        const message = await this.messageRepository.create(finalData);
        if (message.isEncrypted && message.iv && message.tag) {
            message.content = this.decryptMessage(message.content, message.iv, message.tag, data.chatRoomId);
        }
        await this.chatRoomMemberRepository.updateLastRead({
            chatRoomId: data.chatRoomId,
            userId: data.authorId,
            lastReadAt: new Date()
        });
        return new message_dto_1.MessageResponseDTO({
            message,
            chatRoom: {
                id: data.chatRoomId,
                name: undefined,
                type: 'DM'
            }
        });
    }
    async getMessage(id, userId) {
        const message = await this.messageRepository.findById(id);
        if (!message)
            return null;
        await this.validateMembership(message.chatRoomId, userId);
        if (message.isEncrypted && message.iv && message.tag) {
            try {
                message.content = this.decryptMessage(message.content, message.iv, message.tag, message.chatRoomId);
            }
            catch (error) {
                console.error('Failed to decrypt message for user:', userId, error);
                message.content = '[Message could not be decrypted]';
            }
        }
        return message;
    }
    async getChatRoomMessages(data, userId) {
        await this.validateMembership(data.chatRoomId, userId);
        await this.chatRoomMemberRepository.updateLastRead({
            chatRoomId: data.chatRoomId,
            userId,
            lastReadAt: new Date()
        });
        const messages = await this.messageRepository.findByChatRoomId(data.chatRoomId, data.limit, data.cursor);
        return messages.map(message => {
            if (message.isEncrypted && message.iv && message.tag) {
                try {
                    message.content = this.decryptMessage(message.content, message.iv, message.tag, data.chatRoomId);
                }
                catch (error) {
                    console.error('Failed to decrypt message:', message.id, error);
                    message.content = '[Message could not be decrypted]';
                }
            }
            return message;
        });
    }
    async updateMessage(id, content, userId) {
        const message = await this.messageRepository.findById(id);
        if (!message) {
            throw new Error('Message not found');
        }
        await this.validateMessageAuthor(id, userId);
        const sanitizedContent = this.sanitizeContent(content);
        let updateData = { content: sanitizedContent };
        if (this.shouldEncryptMessage()) {
            const { encryptedContent, iv, tag } = this.encryptMessage(sanitizedContent, message.chatRoomId);
            updateData = {
                content: encryptedContent,
                iv,
                tag,
                isEncrypted: true
            };
        }
        const updatedMessage = await this.messageRepository.update(id, updateData);
        if (updatedMessage.isEncrypted && updatedMessage.iv && updatedMessage.tag) {
            updatedMessage.content = this.decryptMessage(updatedMessage.content, updatedMessage.iv, updatedMessage.tag, updatedMessage.chatRoomId);
        }
        return updatedMessage;
    }
    sanitizeContent(content) {
        const cleanContent = purify.sanitize(content, {
            ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'br'],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true,
            FORCE_BODY: false,
            RETURN_DOM: false,
            RETURN_DOM_FRAGMENT: false,
            SANITIZE_DOM: true
        });
        if (cleanContent.length > 1000) {
            throw new Error('Message content exceeds maximum length');
        }
        if (cleanContent.trim().length === 0) {
            throw new Error('Message content cannot be empty');
        }
        return cleanContent;
    }
    async validateMembership(chatRoomId, userId) {
        const isMember = await this.chatRoomMemberRepository.isMember(chatRoomId, userId);
        if (!isMember) {
            throw new Error('User is not a member of this chat room');
        }
    }
    async validateMessageAuthor(messageId, userId) {
        const message = await this.messageRepository.findById(messageId);
        if (!message || message.authorId !== userId) {
            throw new Error('User is not the author of this message');
        }
    }
}
exports.MessageService = MessageService;
//# sourceMappingURL=message.service.js.map