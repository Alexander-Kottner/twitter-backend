"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const message_dto_1 = require("../dto/message.dto");
const errors_dto_1 = require("../dto/errors.dto");
const crypto_1 = __importDefault(require("crypto"));
const rateLimits = new Map();
const MESSAGE_LIMIT = 10;
const TYPING_LIMIT = 30;
const ROOM_OPERATION_LIMIT = 20;
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;
const activeSessions = new Map();
const processedMessages = new Set();
const securityEvents = new Map();
class ChatGateway {
    io;
    chatService;
    constructor(httpServer, chatService) {
        this.chatService = chatService;
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });
        this.setupMiddleware();
        this.setupEventHandlers();
        this.startSecurityCleanup();
    }
    validateChatRoomId(chatRoomId) {
        if (typeof chatRoomId !== 'string')
            return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(chatRoomId);
    }
    validateMessageContent(content) {
        if (typeof content !== 'string')
            return false;
        if (content.length === 0 || content.length > 2000)
            return false;
        const suspiciousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /data:text\/html/gi,
            /vbscript:/gi
        ];
        return !suspiciousPatterns.some(pattern => pattern.test(content));
    }
    validateSession(socket) {
        if (!socket.sessionId || !socket.userId)
            return false;
        const session = activeSessions.get(socket.sessionId);
        if (!session)
            return false;
        const now = Date.now();
        if (now - session.createdAt > SESSION_TIMEOUT) {
            activeSessions.delete(socket.sessionId);
            return false;
        }
        session.lastActivity = now;
        socket.lastActivity = now;
        return session.userId === socket.userId;
    }
    checkRateLimit(userId, category, limit) {
        const key = `${category}:${userId}`;
        const currentTime = Date.now();
        const resetTime = currentTime + 60 * 1000;
        if (!rateLimits.has(key)) {
            rateLimits.set(key, { count: 0, resetTime });
        }
        const userLimit = rateLimits.get(key);
        if (currentTime > userLimit.resetTime) {
            userLimit.count = 0;
            userLimit.resetTime = resetTime;
        }
        if (userLimit.count >= limit) {
            this.logSecurityEvent(userId, `Rate limit exceeded for ${category}`);
            return false;
        }
        userLimit.count++;
        return true;
    }
    logSecurityEvent(userId, event) {
        const key = `security:${userId}`;
        const currentTime = Date.now();
        if (!securityEvents.has(key)) {
            securityEvents.set(key, { events: [], lastReset: currentTime });
        }
        const userEvents = securityEvents.get(key);
        if (currentTime - userEvents.lastReset > 60 * 60 * 1000) {
            userEvents.events = [];
            userEvents.lastReset = currentTime;
        }
        userEvents.events.push(`${new Date().toISOString()}: ${event}`);
        console.warn(`Security Event - User ${userId}: ${event}`);
        if (userEvents.events.length > 10) {
            console.error(`Multiple security events detected for user ${userId}`);
        }
    }
    async revalidateMembership(chatRoomId, userId) {
        try {
            return await this.chatService.validateChatRoomMembership(chatRoomId, userId);
        }
        catch (error) {
            this.logSecurityEvent(userId, `Membership validation failed for room ${chatRoomId}`);
            return false;
        }
    }
    setupMiddleware() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
                if (!token) {
                    return next(new errors_dto_1.AuthenticationError('Authentication token required'));
                }
                const jwtSecret = process.env.JWT_SECRET;
                if (!jwtSecret) {
                    console.error('JWT_SECRET environment variable is not set');
                    return next(new errors_dto_1.ServerConfigurationError('Server configuration error'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
                const authenticatedSocket = socket;
                const sessionId = crypto_1.default.randomBytes(32).toString('hex');
                authenticatedSocket.userId = decoded.userId;
                authenticatedSocket.sessionId = sessionId;
                authenticatedSocket.lastActivity = Date.now();
                activeSessions.set(sessionId, {
                    userId: decoded.userId,
                    createdAt: Date.now(),
                    lastActivity: Date.now()
                });
                next();
            }
            catch (error) {
                if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                    return next(new errors_dto_1.AuthenticationError('Invalid authentication token'));
                }
                return next(new errors_dto_1.AuthenticationError('Authentication failed'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            const authenticatedSocket = socket;
            const userId = authenticatedSocket.userId;
            if (!userId || !this.validateSession(authenticatedSocket)) {
                socket.disconnect(true);
                return;
            }
            console.log(`User ${userId} connected to chat with session ${authenticatedSocket.sessionId}`);
            socket.join(`user:${userId}`);
            socket.use((packet, next) => {
                if (!this.validateSession(authenticatedSocket)) {
                    socket.disconnect(true);
                    return next(new errors_dto_1.AuthenticationError('Session expired'));
                }
                next();
            });
            socket.on('join_room', async (data) => {
                try {
                    await this.handleJoinRoom(authenticatedSocket, data);
                }
                catch (error) {
                    this.emitStructuredError(socket, error, 'join_room_error');
                }
            });
            socket.on('leave_room', async (data) => {
                try {
                    await this.handleLeaveRoom(authenticatedSocket, data);
                }
                catch (error) {
                    this.emitStructuredError(socket, error, 'leave_room_error');
                }
            });
            socket.on('send_message', async (data) => {
                try {
                    await this.handleSendMessage(authenticatedSocket, data);
                }
                catch (error) {
                    this.emitStructuredError(socket, error, 'send_message_error');
                }
            });
            socket.on('typing', async (data) => {
                try {
                    await this.handleTyping(authenticatedSocket, data);
                }
                catch (error) {
                    this.emitStructuredError(socket, error, 'typing_error');
                }
            });
            socket.on('disconnect', () => {
                console.log(`User ${userId} disconnected from chat`);
                if (authenticatedSocket.sessionId) {
                    activeSessions.delete(authenticatedSocket.sessionId);
                }
            });
        });
    }
    async handleJoinRoom(socket, data) {
        const { chatRoomId } = data;
        const userId = socket.userId;
        if (!this.validateChatRoomId(chatRoomId)) {
            this.logSecurityEvent(userId, `Invalid chat room ID format: ${chatRoomId}`);
            throw new errors_dto_1.AuthorizationError('Invalid chat room identifier');
        }
        if (!this.checkRateLimit(userId, 'room_operations', ROOM_OPERATION_LIMIT)) {
            throw new errors_dto_1.RateLimitError('Too many room operations. Please wait before trying again.');
        }
        const canJoin = await this.revalidateMembership(chatRoomId, userId);
        if (!canJoin) {
            this.logSecurityEvent(userId, `Unauthorized join attempt for room: ${chatRoomId}`);
            throw new errors_dto_1.AuthorizationError('You are not a member of this chat room');
        }
        socket.join(`room:${chatRoomId}`);
        try {
            await this.chatService.updateLastRead(chatRoomId, userId);
            this.io.to(`user:${userId}`).emit('unread_count_updated', {
                chatRoomId,
                unreadCount: 0
            });
        }
        catch (error) {
            console.error(`Failed to update last read timestamp for user ${userId} in room ${chatRoomId}:`, error);
        }
        socket.to(`room:${chatRoomId}`).emit('user_joined', {
            chatRoomId,
            timestamp: new Date().toISOString()
        });
        socket.emit('joined_room', { chatRoomId });
    }
    async handleLeaveRoom(socket, data) {
        const { chatRoomId } = data;
        const userId = socket.userId;
        if (!this.validateChatRoomId(chatRoomId)) {
            this.logSecurityEvent(userId, `Invalid chat room ID format: ${chatRoomId}`);
            throw new errors_dto_1.AuthorizationError('Invalid chat room identifier');
        }
        if (!this.checkRateLimit(userId, 'room_operations', ROOM_OPERATION_LIMIT)) {
            throw new errors_dto_1.RateLimitError('Too many room operations. Please wait before trying again.');
        }
        const rooms = Array.from(socket.rooms);
        if (!rooms.includes(`room:${chatRoomId}`)) {
            this.logSecurityEvent(userId, `Leave attempt for non-joined room: ${chatRoomId}`);
            throw new errors_dto_1.AuthorizationError('You are not in this chat room');
        }
        socket.leave(`room:${chatRoomId}`);
        socket.to(`room:${chatRoomId}`).emit('user_left', {
            chatRoomId,
            timestamp: new Date().toISOString()
        });
        socket.emit('left_room', { chatRoomId });
    }
    async handleSendMessage(socket, data) {
        const { chatRoomId, content, type = message_dto_1.MessageType.TEXT, messageId } = data;
        const userId = socket.userId;
        if (!this.validateChatRoomId(chatRoomId)) {
            this.logSecurityEvent(userId, `Invalid chat room ID in message: ${chatRoomId}`);
            throw new errors_dto_1.AuthorizationError('Invalid chat room identifier');
        }
        if (!this.validateMessageContent(content)) {
            this.logSecurityEvent(userId, 'Invalid message content detected');
            throw new errors_dto_1.AuthorizationError('Invalid message content');
        }
        if (messageId) {
            const dedupKey = `${userId}:${messageId}`;
            if (processedMessages.has(dedupKey)) {
                return;
            }
            processedMessages.add(dedupKey);
            if (processedMessages.size > 10000) {
                const entries = Array.from(processedMessages);
                entries.slice(0, 5000).forEach(id => processedMessages.delete(id));
            }
        }
        if (!this.checkRateLimit(userId, 'messages', MESSAGE_LIMIT)) {
            throw new errors_dto_1.RateLimitError('Message rate limit exceeded. Please wait before sending more messages.');
        }
        const canSend = await this.revalidateMembership(chatRoomId, userId);
        if (!canSend) {
            this.logSecurityEvent(userId, `Unauthorized message attempt for room: ${chatRoomId}`);
            throw new errors_dto_1.AuthorizationError('You are not authorized to send messages to this chat room');
        }
        const messageResponse = await this.chatService.sendMessage({
            chatRoomId,
            authorId: userId,
            content,
            type
        });
        this.io.to(`room:${chatRoomId}`).emit('new_message', {
            message: messageResponse.message,
            chatRoom: messageResponse.chatRoom
        });
        const activeUserIds = await this.getUsersActiveInRoom(chatRoomId);
        for (const activeUserId of activeUserIds) {
            if (activeUserId !== userId) {
                try {
                    await this.chatService.updateLastRead(chatRoomId, activeUserId);
                }
                catch (error) {
                    console.error(`Failed to update last read for active user ${activeUserId}:`, error);
                }
            }
        }
        const roomMembers = await this.chatService.getChatRoomMembers(chatRoomId);
        for (const member of roomMembers) {
            if (member.userId !== userId && !activeUserIds.has(member.userId)) {
                const isStillMember = await this.revalidateMembership(chatRoomId, member.userId);
                if (isStillMember) {
                    this.io.to(`user:${member.userId}`).emit('unread_count_updated', {
                        chatRoomId,
                        unreadCount: await this.chatService.getUnreadCount(chatRoomId, member.userId)
                    });
                }
            }
        }
    }
    async handleTyping(socket, data) {
        const { chatRoomId, isTyping } = data;
        const userId = socket.userId;
        if (!this.validateChatRoomId(chatRoomId)) {
            this.logSecurityEvent(userId, `Invalid chat room ID in typing: ${chatRoomId}`);
            throw new errors_dto_1.AuthorizationError('Invalid chat room identifier');
        }
        if (!this.checkRateLimit(userId, 'typing', TYPING_LIMIT)) {
            throw new errors_dto_1.RateLimitError('Typing rate limit exceeded');
        }
        const canType = await this.revalidateMembership(chatRoomId, userId);
        if (!canType) {
            this.logSecurityEvent(userId, `Unauthorized typing attempt for room: ${chatRoomId}`);
            throw new errors_dto_1.AuthorizationError('You are not a member of this chat room');
        }
        socket.to(`room:${chatRoomId}`).emit('typing_status', {
            chatRoomId,
            isTyping,
            timestamp: new Date().toISOString()
        });
    }
    startSecurityCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [sessionId, session] of activeSessions.entries()) {
                if (now - session.createdAt > SESSION_TIMEOUT) {
                    activeSessions.delete(sessionId);
                }
            }
            for (const [key, limit] of rateLimits.entries()) {
                if (now > limit.resetTime + 60000) {
                    rateLimits.delete(key);
                }
            }
            for (const [key, events] of securityEvents.entries()) {
                if (now - events.lastReset > 24 * 60 * 60 * 1000) {
                    securityEvents.delete(key);
                }
            }
        }, 5 * 60 * 1000);
    }
    emitStructuredError(socket, error, eventType) {
        const authenticatedSocket = socket;
        const userId = authenticatedSocket.userId || 'unknown';
        console.error(`Socket error (${eventType}) for user ${userId}:`, error);
        if (error instanceof errors_dto_1.RateLimitError || error instanceof errors_dto_1.AuthenticationError || error instanceof errors_dto_1.AuthorizationError) {
            this.logSecurityEvent(userId, `${eventType}: ${error.message}`);
            socket.emit('error', {
                type: eventType,
                code: error.code,
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
        else if (error instanceof Error) {
            socket.emit('error', {
                type: eventType,
                code: 'INTERNAL_ERROR',
                message: 'An internal error occurred',
                timestamp: new Date().toISOString()
            });
        }
        else {
            socket.emit('error', {
                type: eventType,
                code: 'UNKNOWN_ERROR',
                message: 'An unexpected error occurred',
                timestamp: new Date().toISOString()
            });
        }
    }
    sendNotification(userId, notification) {
        if (!userId || typeof userId !== 'string') {
            console.error('Invalid userId provided to sendNotification');
            return;
        }
        this.io.to(`user:${userId}`).emit('notification', notification);
    }
    async getRoomSize(chatRoomId) {
        if (!this.validateChatRoomId(chatRoomId)) {
            return 0;
        }
        const room = this.io.sockets.adapter.rooms.get(`room:${chatRoomId}`);
        return room ? room.size : 0;
    }
    getSecurityStats() {
        return {
            activeSessions: activeSessions.size,
            rateLimitedUsers: rateLimits.size,
            securityEvents: securityEvents.size
        };
    }
    forceDisconnectUser(userId, reason) {
        this.logSecurityEvent(userId, `Force disconnect: ${reason}`);
        this.io.to(`user:${userId}`).disconnectSockets(true);
        for (const [sessionId, session] of activeSessions.entries()) {
            if (session.userId === userId) {
                activeSessions.delete(sessionId);
            }
        }
    }
    async getUsersActiveInRoom(roomId) {
        const roomName = `room:${roomId}`;
        const activeUserIds = new Set();
        try {
            const socketsInRoom = await this.io.in(roomName).fetchSockets();
            for (const socket of socketsInRoom) {
                const userId = socket.handshake?.auth?.userId ||
                    (socket.data && socket.data.userId) ||
                    socket.handshake?.query?.userId;
                if (userId && typeof userId === 'string') {
                    activeUserIds.add(userId);
                }
                else {
                    const authenticatedSocket = socket;
                    if (authenticatedSocket.sessionId) {
                        const session = activeSessions.get(authenticatedSocket.sessionId);
                        if (session && session.userId) {
                            activeUserIds.add(session.userId);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error(`Error getting active users in room ${roomId}:`, error);
        }
        return activeUserIds;
    }
}
exports.ChatGateway = ChatGateway;
//# sourceMappingURL=chat.gateway.js.map