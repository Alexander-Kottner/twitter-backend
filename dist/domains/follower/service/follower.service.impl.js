"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowerServiceImpl = void 0;
const errors_1 = require("../../../utils/errors");
class FollowerServiceImpl {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async followUser(followerId, followedId) {
        if (followerId === followedId) {
            throw new errors_1.BadRequestException('No puedes seguirte a ti mismo');
        }
        const isAlreadyFollowing = await this.repository.isFollowing(followerId, followedId);
        if (isAlreadyFollowing) {
            throw new errors_1.BadRequestException('Ya sigues a este usuario');
        }
        return await this.repository.follow(followerId, followedId);
    }
    async unfollowUser(followerId, followedId) {
        if (followerId === followedId) {
            throw new errors_1.BadRequestException('No puedes dejar de seguirte a ti mismo');
        }
        const isFollowing = await this.repository.isFollowing(followerId, followedId);
        if (!isFollowing) {
            throw new errors_1.NotFoundException('No sigues a este usuario');
        }
        await this.repository.unfollow(followerId, followedId);
    }
}
exports.FollowerServiceImpl = FollowerServiceImpl;
//# sourceMappingURL=follower.service.impl.js.map