import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator'

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE'
}

export class CreateMessageDTO {
  @IsNotEmpty()
  @IsString()
  chatRoomId: string

  @IsNotEmpty()
  @IsString()
  authorId: string

  @IsNotEmpty()
  @IsString()
  content: string

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType

  // Encryption fields (set by service layer)
  @IsOptional()
  @IsString()
  iv?: string

  @IsOptional()
  @IsString()
  tag?: string

  @IsOptional()
  isEncrypted?: boolean

  constructor(data: { chatRoomId: string; authorId: string; content: string; type?: MessageType; iv?: string; tag?: string; isEncrypted?: boolean }) {
    this.chatRoomId = data.chatRoomId
    this.authorId = data.authorId
    this.content = data.content
    this.type = data.type || MessageType.TEXT
    this.iv = data.iv
    this.tag = data.tag
    this.isEncrypted = data.isEncrypted
  }
}

export class MessageDTO {
  constructor(message: {
    id: string;
    chatRoomId: string;
    authorId: string;
    content: string;
    type: string;
    isEncrypted?: boolean;
    iv?: string | null;
    tag?: string | null;
    createdAt: Date;
    updatedAt: Date;
    author?: {
      id: string;
      username: string;
      name: string | null;
      profilePicture: string | null;
    };
  }) {
    this.id = message.id
    this.chatRoomId = message.chatRoomId
    this.authorId = message.authorId
    this.content = message.content
    this.type = message.type as MessageType
    this.isEncrypted = message.isEncrypted || false
    this.iv = message.iv || undefined
    this.tag = message.tag || undefined
    this.createdAt = message.createdAt
    this.updatedAt = message.updatedAt
    if (message.author) {
      this.author = {
        id: message.author.id,
        username: message.author.username,
        name: message.author.name ?? undefined,
        profilePicture: message.author.profilePicture ?? undefined
      }
    }
  }

  id: string
  chatRoomId: string
  authorId: string
  content: string
  type: MessageType
  isEncrypted: boolean
  iv?: string
  tag?: string
  createdAt: Date
  updatedAt: Date
  author?: {
    id: string
    username: string
    name?: string
    profilePicture?: string
  }
}

export class MessageResponseDTO {
  constructor(data: MessageResponseDTO) {
    this.message = data.message
    this.chatRoom = data.chatRoom
  }

  message: MessageDTO
  chatRoom: {
    id: string
    name?: string
    type: string
  }
}

export class GetMessagesDTO {
  @IsNotEmpty()
  @IsString()
  chatRoomId: string

  @IsOptional()
  limit?: number

  @IsOptional()
  @IsString()
  cursor?: string

  constructor(data: { chatRoomId: string; limit?: number; cursor?: string }) {
    this.chatRoomId = data.chatRoomId
    this.limit = data.limit
    this.cursor = data.cursor
  }
}