"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserServiceImpl = void 0;
const errors_1 = require("../../../utils/errors");
const dto_1 = require("../dto");
const s3_1 = require("../../../utils/s3");
class UserServiceImpl {
    repository;
    followerRepository;
    constructor(repository, followerRepository) {
        this.repository = repository;
        this.followerRepository = followerRepository;
    }
    async getUser(userId, currentUserId) {
        const user = await this.repository.getById(userId);
        if (!user)
            throw new errors_1.NotFoundException('user');
        let isFollowed = false;
        if (currentUserId && this.followerRepository && currentUserId !== userId) {
            isFollowed = await this.followerRepository.isFollowing(currentUserId, userId);
        }
        const profilePictureUrl = user.profilePicture ? (0, s3_1.getProfilePictureUrl)(user.profilePicture) : null;
        return new dto_1.UserViewDTO({
            id: user.id,
            name: user.name || '',
            username: user.username,
            profilePicture: profilePictureUrl,
            isPrivate: user.isPrivate,
            isFollowed
        });
    }
    async getUserRecommendations(userId, options) {
        const users = await this.repository.getRecommendedUsersPaginated(options);
        return Promise.all(users.map(async (user) => {
            let isFollowed = false;
            if (this.followerRepository && userId !== user.id) {
                isFollowed = await this.followerRepository.isFollowing(userId, user.id);
            }
            const profilePictureUrl = user.profilePicture ? (0, s3_1.getProfilePictureUrl)(user.profilePicture) : null;
            return new dto_1.UserViewDTO({
                id: user.id,
                name: user.name || '',
                username: user.username,
                profilePicture: profilePictureUrl,
                isPrivate: user.isPrivate,
                isFollowed
            });
        }));
    }
    async getUsersByUsername(username, options, currentUserId) {
        const users = await this.repository.getUsersByUsername(username, options);
        return Promise.all(users.map(async (user) => {
            let isFollowed = false;
            if (currentUserId && this.followerRepository && currentUserId !== user.id) {
                isFollowed = await this.followerRepository.isFollowing(currentUserId, user.id);
            }
            const profilePictureUrl = user.profilePicture ? (0, s3_1.getProfilePictureUrl)(user.profilePicture) : null;
            return new dto_1.UserViewDTO({
                id: user.id,
                name: user.name || '',
                username: user.username,
                profilePicture: profilePictureUrl,
                isPrivate: user.isPrivate,
                isFollowed
            });
        }));
    }
    async deleteUser(userId) {
        await this.repository.delete(userId);
    }
    async updatePrivacy(userId, isPrivate) {
        const user = await this.repository.getById(userId);
        if (!user)
            throw new errors_1.NotFoundException('user');
        return await this.repository.updatePrivacy(userId, isPrivate);
    }
    async updateProfilePicture(userId, profilePicture) {
        const user = await this.repository.getById(userId);
        if (!user)
            throw new errors_1.NotFoundException('user');
        return await this.repository.updateProfilePicture(userId, profilePicture);
    }
    async generateProfilePictureUploadUrl(userId, fileExt) {
        const user = await this.repository.getById(userId);
        if (!user)
            throw new errors_1.NotFoundException('user');
        const key = (0, s3_1.generateProfilePictureKey)(userId, fileExt);
        const contentType = this.getContentTypeFromFileExt(fileExt);
        const uploadUrl = await (0, s3_1.generateUploadUrl)(key, contentType);
        return { uploadUrl, key };
    }
    getContentTypeFromFileExt(fileExt) {
        switch (fileExt.toLowerCase()) {
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.png':
                return 'image/png';
            case '.gif':
                return 'image/gif';
            case '.webp':
                return 'image/webp';
            default:
                return 'application/octet-stream';
        }
    }
}
exports.UserServiceImpl = UserServiceImpl;
//# sourceMappingURL=user.service.impl.js.map