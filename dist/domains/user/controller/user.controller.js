"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const http_status_1 = __importDefault(require("http-status"));
require("express-async-errors");
const _utils_1 = require("../../../utils");
const repository_1 = require("../repository");
const service_1 = require("../service");
const dto_1 = require("../dto");
const repository_2 = require("../../../domains/follower/repository");
exports.userRouter = (0, express_1.Router)();
const service = new service_1.UserServiceImpl(new repository_1.UserRepositoryImpl(_utils_1.db), new repository_2.FollowerRepositoryImpl(_utils_1.db));
exports.userRouter.get('/', async (req, res) => {
    const { userId } = res.locals.context;
    const { limit, skip } = req.query;
    const users = await service.getUserRecommendations(userId, { limit: Number(limit), skip: Number(skip) });
    return res.status(http_status_1.default.OK).json(users);
});
exports.userRouter.get('/me', async (req, res) => {
    const { userId } = res.locals.context;
    const user = await service.getUser(userId, userId);
    return res.status(http_status_1.default.OK).json(user);
});
exports.userRouter.get('/:userId', async (req, res) => {
    const { userId } = res.locals.context;
    const { userId: otherUserId } = req.params;
    const user = await service.getUser(otherUserId, userId);
    return res.status(http_status_1.default.OK).json(user);
});
exports.userRouter.delete('/', async (req, res) => {
    const { userId } = res.locals.context;
    await service.deleteUser(userId);
    return res.status(http_status_1.default.OK);
});
exports.userRouter.patch('/privacy', (0, _utils_1.BodyValidation)(dto_1.UpdatePrivacyInputDTO), async (req, res) => {
    const { userId } = res.locals.context;
    const { isPrivate } = req.body;
    const user = await service.updatePrivacy(userId, isPrivate);
    return res.status(http_status_1.default.OK).json(user);
});
exports.userRouter.get('/profile-picture/upload-url', async (req, res) => {
    const { userId } = res.locals.context;
    const { fileExt } = req.query;
    if (!fileExt) {
        return res.status(http_status_1.default.BAD_REQUEST).json({ message: 'File extension is required' });
    }
    const { uploadUrl, key } = await service.generateProfilePictureUploadUrl(userId, fileExt);
    return res.status(http_status_1.default.OK).json({ uploadUrl, key });
});
exports.userRouter.patch('/profile-picture', (0, _utils_1.BodyValidation)(dto_1.UpdateProfilePictureDTO), async (req, res) => {
    const { userId } = res.locals.context;
    const { profilePicture } = req.body;
    const user = await service.updateProfilePicture(userId, profilePicture);
    return res.status(http_status_1.default.OK).json(user);
});
exports.userRouter.get('/by_username/:username', async (req, res) => {
    const { userId } = res.locals.context;
    const { username } = req.params;
    const { limit, skip } = req.query;
    const users = await service.getUsersByUsername(username, {
        limit: limit ? Number(limit) : undefined,
        skip: skip ? Number(skip) : undefined
    }, userId);
    return res.status(http_status_1.default.OK).json(users);
});
//# sourceMappingURL=user.controller.js.map