import { IsNotEmpty, IsOptional, IsString, MaxLength, IsUUID } from 'class-validator'
import { ExtendedUserDTO } from '@domains/user/dto'

export class CreatePostInputDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
    content!: string

  @IsOptional()
  @MaxLength(4)
    images?: string[]
    
  @IsOptional()
  @IsUUID()
    parentId?: string
}

export class PostDTO {
  constructor (post: PostDTO) {
    this.id = post.id
    this.authorId = post.authorId
    this.content = post.content
    this.images = post.images
    this.createdAt = post.createdAt
    this.parentId = post.parentId
  }

  id: string
  authorId: string
  content: string
  images: string[]
  createdAt: Date
  parentId?: string
}

export class ExtendedPostDTO extends PostDTO {
  constructor (post: ExtendedPostDTO) {
    super(post)
    this.author = post.author
    this.qtyComments = post.qtyComments
    this.qtyLikes = post.qtyLikes
    this.qtyRetweets = post.qtyRetweets
    this.hasLiked = post.hasLiked
    this.hasRetweeted = post.hasRetweeted
    this.comments = post.comments
  }

  author!: ExtendedUserDTO
  qtyComments!: number
  qtyLikes!: number
  qtyRetweets!: number
  hasLiked?: boolean
  hasRetweeted?: boolean
  comments?: ExtendedPostDTO[]
}

export class PostImageUploadDTO {
  @IsNotEmpty()
  @IsString()
  postId!: string

  @IsNotEmpty()
  @IsString()
  fileExt!: string

  constructor(postId: string, fileExt: string) {
    this.postId = postId
    this.fileExt = fileExt
  }
}

export class UpdatePostImagesDTO {
  @IsNotEmpty()
  @IsString()
  postId!: string

  @IsNotEmpty()
  @MaxLength(4)
  images!: string[]

  constructor(postId: string, images: string[]) {
    this.postId = postId
    this.images = images
  }
}
