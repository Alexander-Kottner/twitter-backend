import { CreateChatRoomDTO, UpdateChatRoomDTO, ChatRoomDTO } from '../dto/chat-room.dto'

export interface ChatRoomRepository {
  create: (data: CreateChatRoomDTO) => Promise<ChatRoomDTO>
  findById: (id: string) => Promise<ChatRoomDTO | null>
  findByMemberId: (userId: string) => Promise<ChatRoomDTO[]>
  findDMBetweenUsers: (user1Id: string, user2Id: string) => Promise<ChatRoomDTO | null>
  update: (id: string, data: UpdateChatRoomDTO) => Promise<ChatRoomDTO>
  delete: (id: string) => Promise<void>
  getUnreadCountForUser: (chatRoomId: string, userId: string) => Promise<number>
  // RACE CONDITION FIX: Add atomic DM creation method
  findOrCreateDMTransaction: (user1Id: string, user2Id: string) => Promise<ChatRoomDTO>
  // TRANSACTION FIX: Add atomic group chat creation method
  createWithTransaction: (data: CreateChatRoomDTO) => Promise<ChatRoomDTO>
}