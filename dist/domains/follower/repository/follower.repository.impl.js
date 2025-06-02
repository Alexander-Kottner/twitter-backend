"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowerRepositoryImpl = void 0;
const dto_1 = require("../dto");
class FollowerRepositoryImpl {
    db;
    constructor(db) {
        this.db = db;
    }
    async follow(followerId, followedId) {
        const follow = await this.db.follow.create({
            data: {
                followerId,
                followedId
            }
        });
        return new dto_1.FollowDTO(follow);
    }
    async unfollow(followerId, followedId) {
        await this.db.follow.deleteMany({
            where: {
                followerId,
                followedId
            }
        });
    }
    async isFollowing(followerId, followedId) {
        const follow = await this.db.follow.findFirst({
            where: {
                followerId,
                followedId,
                deletedAt: null
            }
        });
        return !!follow;
    }
}
exports.FollowerRepositoryImpl = FollowerRepositoryImpl;
//# sourceMappingURL=follower.repository.impl.js.map