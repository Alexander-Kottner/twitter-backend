"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthServiceImpl = void 0;
const _utils_1 = require("../../../utils");
class AuthServiceImpl {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async signup(data) {
        const existingUser = await this.repository.getByEmailOrUsername(data.email, data.username);
        if (existingUser)
            throw new _utils_1.ConflictException('USER_ALREADY_EXISTS');
        const encryptedPassword = await (0, _utils_1.encryptPassword)(data.password);
        const user = await this.repository.create({ ...data, password: encryptedPassword });
        const token = (0, _utils_1.generateAccessToken)({ userId: user.id });
        return { token };
    }
    async login(data) {
        const user = await this.repository.getByEmailOrUsername(data.email, data.username);
        if (!user)
            throw new _utils_1.NotFoundException('user');
        const isCorrectPassword = await (0, _utils_1.checkPassword)(data.password, user.password);
        if (!isCorrectPassword)
            throw new _utils_1.UnauthorizedException('INCORRECT_PASSWORD');
        const token = (0, _utils_1.generateAccessToken)({ userId: user.id });
        return { token };
    }
}
exports.AuthServiceImpl = AuthServiceImpl;
//# sourceMappingURL=auth.service.impl.js.map