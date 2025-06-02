"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.followerRouter = void 0;
const express_1 = require("express");
const http_status_1 = __importDefault(require("http-status"));
require("express-async-errors");
const _utils_1 = require("../../../utils");
const repository_1 = require("../repository");
const service_1 = require("../service");
exports.followerRouter = (0, express_1.Router)();
const service = new service_1.FollowerServiceImpl(new repository_1.FollowerRepositoryImpl(_utils_1.db));
exports.followerRouter.post('/follow/:userId', async (req, res) => {
    const { userId: currentUserId } = res.locals.context;
    const { userId: userToFollowId } = req.params;
    const follow = await service.followUser(currentUserId, userToFollowId);
    return res.status(http_status_1.default.CREATED).json({
        message: 'Has comenzado a seguir a este usuario',
        follow
    });
});
exports.followerRouter.post('/unfollow/:userId', async (req, res) => {
    const { userId: currentUserId } = res.locals.context;
    const { userId: userToUnfollowId } = req.params;
    await service.unfollowUser(currentUserId, userToUnfollowId);
    return res.status(http_status_1.default.OK).json({
        message: 'Has dejado de seguir a este usuario'
    });
});
//# sourceMappingURL=follower.controller.js.map