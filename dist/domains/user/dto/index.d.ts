export declare class UserDTO {
    constructor(user: UserDTO);
    id: string;
    name: string | null;
    createdAt: Date;
    isPrivate: boolean;
    profilePicture: string | null;
}
export declare class ExtendedUserDTO extends UserDTO {
    constructor(user: ExtendedUserDTO);
    email: string;
    username: string;
    password: string;
}
export declare class UserViewDTO {
    constructor(user: UserViewDTO);
    id: string;
    name: string;
    username: string;
    profilePicture: string | null;
    isPrivate: boolean;
    isFollowed: boolean;
}
export declare class UpdatePrivacyInputDTO {
    isPrivate: boolean;
    constructor(isPrivate: boolean);
}
export declare class UpdateProfilePictureDTO {
    profilePicture: string;
    constructor(profilePicture: string);
}
