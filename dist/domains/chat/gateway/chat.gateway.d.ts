/// <reference types="node" />
import { Server as HTTPServer } from 'http';
import { ChatService } from '../service/chat.service';
export declare class ChatGateway {
    private io;
    private chatService;
    constructor(httpServer: HTTPServer, chatService: ChatService);
    private validateChatRoomId;
    private validateMessageContent;
    private validateSession;
    private checkRateLimit;
    private logSecurityEvent;
    private revalidateMembership;
    private setupMiddleware;
    private setupEventHandlers;
    private handleJoinRoom;
    private handleLeaveRoom;
    private handleSendMessage;
    private handleTyping;
    private startSecurityCleanup;
    private emitStructuredError;
    sendNotification(userId: string, notification: any): void;
    getRoomSize(chatRoomId: string): Promise<number>;
    getSecurityStats(): {
        activeSessions: number;
        rateLimitedUsers: number;
        securityEvents: number;
    };
    forceDisconnectUser(userId: string, reason: string): void;
    private getUsersActiveInRoom;
}
