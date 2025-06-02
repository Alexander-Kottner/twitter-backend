import { IsNotEmpty, IsOptional, IsString, MaxLength, IsUUID, IsInt, Min, Max, ValidateNested, ArrayMaxSize } from 'class-validator'
import { ExtendedUserDTO } from '@domains/user/dto'
import { Type } from 'class-transformer'

export class PostImageDTO {
  constructor (image: PostImageDTO) {
    this.id = image.id
    this.postId = image.postId
    this.s3Key = image.s3Key
    this.index = image.index
    this.createdAt = image.createdAt
    this.url = image.url
  }

  id: string
  postId: string
  s3Key: string
  index: number
  createdAt: Date
  url?: string | null // Presigned URL for accessing the image
}

export class CreatePostImageDTO {
  @IsString()
  @IsNotEmpty()
    postId!: string

  @IsString()
  @IsNotEmpty()
    s3Key!: string

  @IsInt()
  @Min(0)
  @Max(3)
    index!: number
}

export class CreatePostInputDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
    content!: string

  @IsOptional()
  @IsUUID()
    parentId?: string
}

export class PostDTO {
  constructor (post: PostDTO) {
    this.id = post.id
    this.authorId = post.authorId
    this.content = post.content
    this.createdAt = post.createdAt
    this.parentId = post.parentId
    this.likeCount = post.likeCount || 0
    this.retweetCount = post.retweetCount || 0
    this.images = post.images || []
  }

  id: string
  authorId: string
  content: string
  createdAt: Date
  parentId?: string
  likeCount: number
  retweetCount: number
  images: PostImageDTO[]
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

  @IsInt()
  @Min(0)
  @Max(3)
  index!: number

  constructor(postId: string, fileExt: string, index: number) {
    this.postId = postId
    this.fileExt = fileExt
    this.index = index
  }
}

export class UpdatePostImagesDTO {
  @IsNotEmpty()
  @IsString()
  postId!: string

  @ValidateNested({ each: true })
  @ArrayMaxSize(4)
  @Type(() => CreatePostImageDTO)
  images!: CreatePostImageDTO[]

  constructor(postId: string, images: CreatePostImageDTO[]) {
    this.postId = postId
    this.images = images
  }
}
