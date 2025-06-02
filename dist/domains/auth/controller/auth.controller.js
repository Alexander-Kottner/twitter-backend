"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const http_status_1 = __importDefault(require("http-status"));
require("express-async-errors");
const _utils_1 = require("../../../utils");
const repository_1 = require("../../../domains/user/repository");
const service_1 = require("../service");
const dto_1 = require("../dto");
exports.authRouter = (0, express_1.Router)();
const service = new service_1.AuthServiceImpl(new repository_1.UserRepositoryImpl(_utils_1.db));
exports.authRouter.post('/signup', (0, _utils_1.BodyValidation)(dto_1.SignupInputDTO), async (req, res) => {
    const data = req.body;
    const token = await service.signup(data);
    return res.status(http_status_1.default.CREATED).json(token);
});
exports.authRouter.post('/login', (0, _utils_1.BodyValidation)(dto_1.LoginInputDTO), async (req, res) => {
    const data = req.body;
    const token = await service.login(data);
    return res.status(http_status_1.default.OK).json(token);
});
//# sourceMappingURL=auth.controller.js.map