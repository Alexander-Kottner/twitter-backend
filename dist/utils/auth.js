"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPassword = exports.encryptPassword = exports.withAuth = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const constants_1 = require("./constants");
const errors_1 = require("./errors");
const generateAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, constants_1.Constants.TOKEN_SECRET, { expiresIn: '24h' });
};
exports.generateAccessToken = generateAccessToken;
const withAuth = (req, res, next) => {
    const [bearer, token] = (req.headers.authorization)?.split(' ') ?? [];
    if (!bearer || !token || bearer !== 'Bearer')
        throw new errors_1.UnauthorizedException('MISSING_TOKEN');
    jsonwebtoken_1.default.verify(token, constants_1.Constants.TOKEN_SECRET, (err, context) => {
        if (err)
            throw new errors_1.UnauthorizedException('INVALID_TOKEN');
        res.locals.context = context;
        next();
    });
};
exports.withAuth = withAuth;
const encryptPassword = async (password) => {
    return await bcrypt_1.default.hash(password, 10);
};
exports.encryptPassword = encryptPassword;
const checkPassword = async (password, hash) => {
    return await bcrypt_1.default.compare(password, hash);
};
exports.checkPassword = checkPassword;
//# sourceMappingURL=auth.js.map