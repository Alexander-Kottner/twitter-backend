"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProfilePictureDTO = exports.UpdatePrivacyInputDTO = exports.UserViewDTO = exports.ExtendedUserDTO = exports.UserDTO = void 0;
class UserDTO {
    constructor(user) {
        this.id = user.id;
        this.name = user.name;
        this.createdAt = user.createdAt;
        this.isPrivate = user.isPrivate || false;
        this.profilePicture = user.profilePicture || null;
    }
    id;
    name;
    createdAt;
    isPrivate;
    profilePicture;
}
exports.UserDTO = UserDTO;
class ExtendedUserDTO extends UserDTO {
    constructor(user) {
        super(user);
        this.email = user.email;
        this.name = user.name;
        this.password = user.password;
    }
    email;
    username;
    password;
}
exports.ExtendedUserDTO = ExtendedUserDTO;
class UserViewDTO {
    constructor(user) {
        this.id = user.id;
        this.name = user.name;
        this.username = user.username;
        this.profilePicture = user.profilePicture;
        this.isPrivate = user.isPrivate || false;
        this.isFollowed = user.isFollowed || false;
    }
    id;
    name;
    username;
    profilePicture;
    isPrivate;
    isFollowed;
}
exports.UserViewDTO = UserViewDTO;
class UpdatePrivacyInputDTO {
    isPrivate;
    constructor(isPrivate) {
        this.isPrivate = isPrivate;
    }
}
exports.UpdatePrivacyInputDTO = UpdatePrivacyInputDTO;
class UpdateProfilePictureDTO {
    profilePicture;
    constructor(profilePicture) {
        this.profilePicture = profilePicture;
    }
}
exports.UpdateProfilePictureDTO = UpdateProfilePictureDTO;
//# sourceMappingURL=index.js.map