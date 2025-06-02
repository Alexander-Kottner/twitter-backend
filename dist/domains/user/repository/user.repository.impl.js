"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepositoryImpl = void 0;
const dto_1 = require("../dto");
class UserRepositoryImpl {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(data) {
        return await this.db.user.create({
            data
        }).then((user) => new dto_1.UserDTO(user));
    }
    async getById(userId) {
        const user = await this.db.user.findUnique({
            where: {
                id: userId
            }
        });
        return user ? new dto_1.ExtendedUserDTO(user) : null;
    }
    async delete(userId) {
        await this.db.user.delete({
            where: {
                id: userId
            }
        });
    }
    async getRecommendedUsersPaginated(options) {
        const users = await this.db.user.findMany({
            take: options.limit ? options.limit : undefined,
            skip: options.skip ? options.skip : undefined,
            orderBy: [
                {
                    id: 'asc'
                }
            ]
        });
        return users.map((user) => new dto_1.ExtendedUserDTO(user));
    }
    async getByEmailOrUsername(email, username) {
        const user = await this.db.user.findFirst({
            where: {
                OR: [
                    {
                        email
                    },
                    {
                        username
                    }
                ]
            }
        });
        return user ? new dto_1.ExtendedUserDTO(user) : null;
    }
    async updatePrivacy(userId, isPrivate) {
        const user = await this.db.user.update({
            where: {
                id: userId
            },
            data: {
                isPrivate
            }
        });
        return new dto_1.UserDTO(user);
    }
    async updateProfilePicture(userId, profilePicture) {
        const user = await this.db.user.update({
            where: {
                id: userId
            },
            data: {
                profilePicture
            }
        });
        return new dto_1.UserDTO(user);
    }
    async getUsersByUsername(username, options) {
        const users = await this.db.user.findMany({
            where: {
                username: {
                    contains: username,
                    mode: 'insensitive'
                }
            },
            take: options.limit ? options.limit : undefined,
            skip: options.skip ? options.skip : undefined,
            orderBy: {
                username: 'asc'
            }
        });
        return users.map((user) => new dto_1.ExtendedUserDTO(user));
    }
}
exports.UserRepositoryImpl = UserRepositoryImpl;
//# sourceMappingURL=user.repository.impl.js.map