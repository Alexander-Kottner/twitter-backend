"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const dto_1 = require("../dto");
const message_dto_1 = require("../dto/message.dto");
const _utils_1 = require("../../../utils");
const errors_dto_1 = require("../dto/errors.dto");
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    next();
};
class ChatController {
    chatService;
    constructor(chatService) {
        this.chatService = chatService;
    }
    getChatRooms = async (req, res) => {
        try {
            const userId = res.locals.context.userId;
            const chatRooms = await this.chatService.getUserChatRooms(userId);
            res.json(chatRooms);
        }
        catch (error) {
            this.handleError(error, res);
        }
    };
    createOrGetDM = async (req, res) => {
        try {
            const { targetUserId } = req.body;
            const userId = res.locals.context.userId;
            if (userId === targetUserId) {
                throw new errors_dto_1.ValidationError('Cannot create DM with yourself');
            }
            const chatRoom = await this.chatService.findOrCreateDMChatRoom(userId, targetUserId);
            res.json(chatRoom);
        }
        catch (error) {
            this.handleError(error, res);
        }
    };
    createGroupChat = async (req, res) => {
        try {
            const { name, memberIds } = req.body;
            const userId = res.locals.context.userId;
            const createData = new dto_1.CreateChatRoomDTO({
                name,
                type: dto_1.ChatRoomType.GROUP,
                memberIds: [...memberIds, userId]
            });
            const chatRoom = await this.chatService.createChatRoom(createData, userId);
            res.json(chatRoom);
        }
        catch (error) {
            this.handleError(error, res);
        }
    };
    getChatRoom = async (req, res) => {
        try {
            const { chatRoomId } = req.params;
            const userId = res.locals.context.userId;
            const isValid = await this.chatService.validateChatRoomMembership(chatRoomId, userId);
            if (!isValid) {
                throw new errors_dto_1.AuthorizationError('Not a member of this chat room');
            }
            const members = await this.chatService.getChatRoomMembers(chatRoomId, userId);
            res.json({ members });
        }
        catch (error) {
            this.handleError(error, res);
        }
    };
    getChatRoomMessages = async (req, res) => {
        try {
            const { chatRoomId } = req.params;
            const { limit = 50, cursor } = req.query;
            const userId = res.locals.context.userId;
            const messages = await this.chatService.getChatRoomMessages(chatRoomId, userId, parseInt(limit), cursor);
            res.json(messages);
        }
        catch (error) {
            this.handleError(error, res);
        }
    };
    sendMessage = async (req, res) => {
        try {
            const { chatRoomId } = req.params;
            const { content, type = dto_1.MessageType.TEXT } = req.body;
            const userId = res.locals.context.userId;
            const createData = new message_dto_1.CreateMessageDTO({
                chatRoomId,
                authorId: userId,
                content,
                type
            });
            const messageResponse = await this.chatService.sendMessage(createData);
            res.json(messageResponse);
        }
        catch (error) {
            this.handleError(error, res);
        }
    };
    handleError(error, res) {
        console.error('Chat controller error:', error);
        if (error instanceof errors_dto_1.ChatError) {
            res.status(error.statusCode).json({
                error: {
                    code: error.code,
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }
        else if (error instanceof Error) {
            const sanitizedMessage = this.sanitizeErrorMessage(error.message);
            res.status(500).json({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: sanitizedMessage,
                    timestamp: new Date().toISOString()
                }
            });
        }
        else {
            res.status(500).json({
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: 'An unexpected error occurred',
                    timestamp: new Date().toISOString()
                }
            });
        }
    }
    sanitizeErrorMessage(message) {
        const sensitivePatterns = [
            /database\s+error/i,
            /connection\s+failed/i,
            /prisma/i,
            /postgresql/i,
            /sql/i,
            /internal\s+server/i
        ];
        for (const pattern of sensitivePatterns) {
            if (pattern.test(message)) {
                return 'A server error occurred. Please try again later.';
            }
        }
        return message;
    }
    static routes(chatService) {
        const router = (0, express_1.Router)();
        const controller = new ChatController(chatService);
        router.use(_utils_1.withAuth);
        router.get('/rooms', controller.getChatRooms);
        router.post('/rooms/dm', [
            (0, express_validator_1.body)('targetUserId').isUUID().withMessage('Valid target user ID required')
        ], validate, controller.createOrGetDM);
        router.post('/rooms/group', [
            (0, express_validator_1.body)('name').optional().isString().withMessage('Name must be a string'),
            (0, express_validator_1.body)('memberIds').isArray().withMessage('Member IDs must be an array'),
            (0, express_validator_1.body)('memberIds.*').isUUID().withMessage('Each member ID must be a valid UUID')
        ], validate, controller.createGroupChat);
        router.get('/rooms/:chatRoomId', [
            (0, express_validator_1.param)('chatRoomId').isUUID().withMessage('Valid chat room ID required')
        ], validate, controller.getChatRoom);
        router.get('/rooms/:chatRoomId/messages', [
            (0, express_validator_1.param)('chatRoomId').isUUID().withMessage('Valid chat room ID required'),
            (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
            (0, express_validator_1.query)('cursor').optional().isUUID().withMessage('Cursor must be a valid UUID')
        ], validate, controller.getChatRoomMessages);
        router.post('/rooms/:chatRoomId/messages', [
            (0, express_validator_1.param)('chatRoomId').isUUID().withMessage('Valid chat room ID required'),
            (0, express_validator_1.body)('content').isString().isLength({ min: 1, max: 1000 }).withMessage('Content must be 1-1000 characters'),
            (0, express_validator_1.body)('type').optional().isIn(['TEXT', 'IMAGE', 'FILE']).withMessage('Invalid message type')
        ], validate, controller.sendMessage);
        return router;
    }
}
exports.ChatController = ChatController;
//# sourceMappingURL=chat.controller.js.map