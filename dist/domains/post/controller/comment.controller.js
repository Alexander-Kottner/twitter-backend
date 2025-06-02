"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentRouter = void 0;
const express_1 = require("express");
const http_status_1 = __importDefault(require("http-status"));
require("express-async-errors");
const _utils_1 = require("../../../utils");
const repository_1 = require("../repository");
const service_1 = require("../service");
exports.commentRouter = (0, express_1.Router)();
const service = new service_1.PostServiceImpl(new repository_1.PostRepositoryImpl(_utils_1.db));
exports.commentRouter.get('/:post_id', async (req, res) => {
    const { userId } = res.locals.context;
    const { post_id } = req.params;
    const { limit, before, after } = req.query;
    const comments = await service.getCommentsByPostIdPaginated(userId, post_id, {
        limit: limit ? Number(limit) : undefined,
        before,
        after
    });
    return res.status(http_status_1.default.OK).json(comments);
});
//# sourceMappingURL=comment.controller.js.map