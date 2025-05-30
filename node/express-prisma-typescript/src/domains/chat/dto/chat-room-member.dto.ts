import { IsNotEmpty, IsString, IsDateString } from 'class-validator'

export class AddMemberToChatRoomDTO {
  @IsNotEmpty()
  @IsString()
  chatRoomId: string

  @IsNotEmpty()
  @IsString()
  userId: string

  constructor(data: { chatRoomId: string; userId: string }) {
    this.chatRoomId = data.chatRoomId
    this.userId = data.userId
  }
}

export class ChatRoomMemberDTO {
  constructor(member: {
    id: string
    chatRoomId: string
    userId: string
    joinedAt: Date
    lastReadAt: Date | null
    user?: {
      id: string
      username: string
      name: string | null
      profilePicture: string | null
    }
    chatRoom?: any
  }) {
    this.id = member.id
    this.chatRoomId = member.chatRoomId
    this.userId = member.userId
    this.joinedAt = member.joinedAt
    this.lastReadAt = member.lastReadAt ?? undefined
    if (member.user) {
      this.user = {
        id: member.user.id,
        username: member.user.username,
        name: member.user.name ?? undefined,
        profilePicture: member.user.profilePicture ?? undefined,
      }
    }
    if (member.chatRoom) {
      this.chatRoom = member.chatRoom
    }
  }

  id: string
  chatRoomId: string
  userId: string
  joinedAt: Date
  lastReadAt?: Date
  user?: {
    id: string
    username: string
    name?: string
    profilePicture?: string
  }
  chatRoom?: any
}

export class RemoveMemberFromChatRoomDTO {
  @IsNotEmpty()
  @IsString()
  chatRoomId: string

  @IsNotEmpty()
  @IsString()
  userId: string

  constructor(data: { chatRoomId: string; userId: string }) {
    this.chatRoomId = data.chatRoomId
    this.userId = data.userId
  }
}

export class UpdateLastReadDTO {
  @IsNotEmpty()
  @IsString()
  chatRoomId: string

  @IsNotEmpty()
  @IsString()
  userId: string

  @IsNotEmpty()
  @IsDateString()
  lastReadAt: Date

  constructor(data: { chatRoomId: string; userId: string; lastReadAt: Date }) {
    this.chatRoomId = data.chatRoomId
    this.userId = data.userId
    this.lastReadAt = data.lastReadAt
  }
}