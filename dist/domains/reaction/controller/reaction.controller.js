"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reactionRouter = void 0;
const express_1 = require("express");
const http_status_1 = __importDefault(require("http-status"));
require("express-async-errors");
const _utils_1 = require("../../../utils");
const repository_1 = require("../repository");
const service_1 = require("../service");
const dto_1 = require("../dto");
exports.reactionRouter = (0, express_1.Router)();
const service = new service_1.ReactionServiceImpl(new repository_1.ReactionRepositoryImpl(_utils_1.db));
exports.reactionRouter.post('/:post_id', (0, _utils_1.BodyValidation)(dto_1.CreateReactionDTO), async (req, res) => {
    const { userId } = res.locals.context;
    const { post_id } = req.params;
    const { type } = req.body;
    req.body.postId = post_id;
    const reaction = await service.createReaction(userId, post_id, type);
    return res.status(http_status_1.default.CREATED).json(reaction);
});
exports.reactionRouter.delete('/:post_id', (0, _utils_1.BodyValidation)(dto_1.CreateReactionDTO), async (req, res) => {
    const { userId } = res.locals.context;
    const { post_id } = req.params;
    const { type } = req.body;
    req.body.postId = post_id;
    await service.deleteReaction(userId, post_id, type);
    return res.status(http_status_1.default.OK).send({ message: `Reaction removed from post ${post_id}` });
});
exports.reactionRouter.get('/:post_id', async (req, res) => {
    const { post_id } = req.params;
    const counts = await service.getReactionCountsForPost(post_id);
    return res.status(http_status_1.default.OK).json(counts);
});
exports.reactionRouter.get('/:post_id/status', async (req, res) => {
    const { userId } = res.locals.context;
    const { post_id } = req.params;
    const { type } = req.query;
    if (!type || !Object.values(dto_1.ReactionType).includes(type)) {
        return res.status(http_status_1.default.BAD_REQUEST).json({
            message: 'Invalid reaction type. Must be LIKE or RETWEET'
        });
    }
    const hasReacted = await service.hasUserReacted(userId, post_id, type);
    return res.status(http_status_1.default.OK).json({ hasReacted });
});
exports.reactionRouter.get('/user/:user_id/likes', async (req, res) => {
    const { user_id } = req.params;
    const likes = await service.getUserReactions(user_id, dto_1.ReactionType.LIKE);
    return res.status(http_status_1.default.OK).json(likes);
});
exports.reactionRouter.get('/user/:user_id/retweets', async (req, res) => {
    const { user_id } = req.params;
    const retweets = await service.getUserReactions(user_id, dto_1.ReactionType.RETWEET);
    return res.status(http_status_1.default.OK).json(retweets);
});
//# sourceMappingURL=reaction.controller.js.map