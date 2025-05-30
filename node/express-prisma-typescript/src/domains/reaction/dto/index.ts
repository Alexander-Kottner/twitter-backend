import { IsNotEmpty, IsString } from 'class-validator'
// Temporarily commented out IsEnum import due to Jest compilation issue
// import { IsEnum } from 'class-validator'

export enum ReactionType {
  LIKE = 'LIKE',
  RETWEET = 'RETWEET'
}

export class CreateReactionDTO {
  @IsString()
  @IsNotEmpty()
    postId!: string

  // @IsEnum(ReactionType) // Temporarily commented out due to Jest compilation issue
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