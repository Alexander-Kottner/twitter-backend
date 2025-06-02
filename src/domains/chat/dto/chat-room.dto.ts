import { IsNotEmpty, IsString, IsArray, IsOptional, IsEnum } from 'class-validator'

export enum ChatRoomType {
  DM = 'DM',
  GROUP = 'GROUP'
}

export class CreateChatRoomDTO {
  @IsOptional()
  @IsString()
  name?: string

  @IsNotEmpty()
  @IsEnum(ChatRoomType)
  type: ChatRoomType

  @IsNotEmpty()
  @IsArray()
  memberIds: string[]

  constructor(data: { name?: string; type: ChatRoomType; memberIds: string[] }) {
    this.name = data.name
    this.type = data.type
    this.memberIds = data.memberIds
  }
}

export class ChatRoomDTO {
  constructor(chatRoom: {
    id: string;
    name: string | null;
    type: string;
    createdAt: Date;
    updatedAt: Date;
    members?: Array<{
      id: string;
      chatRoomId: string;
      userId: string;
      joinedAt: Date;
      lastReadAt: Date | null;
      user: {
        id: string;
        username: string;
        name: string | null;
        profilePicture: string | null;
      };
    }>;
  }) {
    this.id = chatRoom.id
    this.name = chatRoom.name ?? undefined
    this.type = chatRoom.type as ChatRoomType
    this.createdAt = chatRoom.createdAt
    this.updatedAt = chatRoom.updatedAt
    this.members = chatRoom.members?.map(member => ({
      id: member.id,
      chatRoomId: member.chatRoomId,
      userId: member.userId,
      joinedAt: member.joinedAt,
      lastReadAt: member.lastReadAt,
      user: {
        id: member.user.id,
        username: member.user.username,
        name: member.user.name,
        profilePicture: member.user.profilePicture
      }
    }))
  }

  id: string
  name?: string
  type: ChatRoomType
  createdAt: Date
  updatedAt: Date
  members?: Array<{
    id: string;
    chatRoomId: string;
    userId: string;
    joinedAt: Date;
    lastReadAt: Date | null;
    user: {
      id: string;
      username: string;
      name: string | null;
      profilePicture: string | null;
    };
  }>
}

export class ChatRoomSummaryDTO {
  constructor(data: ChatRoomSummaryDTO) {
    this.id = data.id
    this.name = data.name
    this.type = data.type
    this.memberCount = data.memberCount
    this.lastMessage = data.lastMessage
    this.unreadCount = data.unreadCount
  }

  id: string
  name?: string
  type: ChatRoomType
  memberCount: number
  lastMessage?: {
    content: string
    createdAt: Date
    authorName: string
  }
  unreadCount: number
}

export class UpdateChatRoomDTO {
  @IsOptional()
  @IsString()
  name?: string

  constructor(data: { name?: string }) {
    this.name = data.name
  }
}