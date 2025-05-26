import { IsEnum, IsNotEmpty, IsString } from 'class-validator'

export enum ReactionType {
  LIKE = 'LIKE',
  RETWEET = 'RETWEET'
}

export class CreateReactionDTO {
  @IsString()
  @IsNotEmpty()
    postId!: string

  @IsEnum(ReactionType)
    type!: ReactionType
}

export class ReactionDTO {
  constructor (reaction: ReactionDTO) {
    this.id = reaction.id
    this.userId = reaction.userId
    this.postId = reaction.postId
    this.type = reaction.type
    this.createdAt = reaction.createdAt
  }

  id: string
  userId: string
  postId: string
  type: ReactionType
  createdAt: Date
} 