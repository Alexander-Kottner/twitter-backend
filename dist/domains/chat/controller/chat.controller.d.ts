import { Request, Response, Router } from 'express';
import { ChatService } from '../service/chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getChatRooms: (req: Request, res: Response) => Promise<void>;
    createOrGetDM: (req: Request, res: Response) => Promise<void>;
    createGroupChat: (req: Request, res: Response) => Promise<void>;
    getChatRoom: (req: Request, res: Response) => Promise<void>;
    getChatRoomMessages: (req: Request, res: Response) => Promise<void>;
    sendMessage: (req: Request, res: Response) => Promise<void>;
    private handleError;
    private sanitizeErrorMessage;
    static routes(chatService: ChatService): Router;
}
