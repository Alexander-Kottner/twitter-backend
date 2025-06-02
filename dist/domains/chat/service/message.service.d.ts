import { MessageRepository } from '../repository/message.repository';
import { ChatRoomMemberRepository } from '../repository/chat-room-member.repository';
import { CreateMessageDTO, MessageDTO, MessageResponseDTO, GetMessagesDTO } from '../dto/message.dto';
export declare class MessageService {
    private readonly messageRepository;
    private readonly chatRoomMemberRepository;
    constructor(messageRepository: MessageRepository, chatRoomMemberRepository: ChatRoomMemberRepository);
    private encryptMessage;
    private decryptMessage;
    private deriveRoomKey;
    private shouldEncryptMessage;
    createMessage(data: CreateMessageDTO): Promise<MessageResponseDTO>;
    getMessage(id: string, userId: string): Promise<MessageDTO | null>;
    getChatRoomMessages(data: GetMessagesDTO, userId: string): Promise<MessageDTO[]>;
    updateMessage(id: string, content: string, userId: string): Promise<MessageDTO>;
    private sanitizeContent;
    private validateMembership;
    private validateMessageAuthor;
}
