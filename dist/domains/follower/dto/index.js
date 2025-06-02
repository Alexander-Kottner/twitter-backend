"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowDTO = void 0;
class FollowDTO {
    constructor(follow) {
        this.id = follow.id;
        this.followerId = follow.followerId;
        this.followedId = follow.followedId;
        this.createdAt = follow.createdAt;
    }
    id;
    followerId;
    followedId;
    createdAt;
}
exports.FollowDTO = FollowDTO;
//# sourceMappingURL=index.js.map