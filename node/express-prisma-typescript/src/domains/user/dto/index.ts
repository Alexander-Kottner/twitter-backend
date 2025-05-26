import { IsBoolean, IsNotEmpty } from 'class-validator'

export class UserDTO {
  constructor (user: UserDTO) {
    this.id = user.id
    this.name = user.name
    this.createdAt = user.createdAt
    this.isPrivate = user.isPrivate || false
    this.profilePicture = user.profilePicture || null
  }

  id: string
  name: string | null
  createdAt: Date
  isPrivate: boolean
  profilePicture: string | null
}

export class ExtendedUserDTO extends UserDTO {
  constructor (user: ExtendedUserDTO) {
    super(user)
    this.email = user.email
    this.name = user.name
    this.password = user.password
  }

  email!: string
  username!: string
  password!: string
}

export class UserViewDTO {
  constructor (user: UserViewDTO) {
    this.id = user.id
    this.name = user.name
    this.username = user.username
    this.profilePicture = user.profilePicture
    this.isPrivate = user.isPrivate || false
    this.isFollowed = user.isFollowed || false
  }

  id: string
  name: string
  username: string
  profilePicture: string | null
  isPrivate: boolean
  isFollowed: boolean
}

export class UpdatePrivacyInputDTO {
  @IsBoolean()
  @IsNotEmpty()
  isPrivate: boolean

  constructor(isPrivate: boolean) {
    this.isPrivate = isPrivate
  }
}

export class UpdateProfilePictureDTO {
  @IsNotEmpty()
  profilePicture: string

  constructor(profilePicture: string) {
    this.profilePicture = profilePicture
  }
}
