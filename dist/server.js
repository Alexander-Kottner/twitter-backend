"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const _utils_1 = require("./utils");
const logger_1 = require("./utils/logger");
const _router_1 = require("./router");
const errors_1 = require("./utils/errors");
const swagger_1 = require("./utils/swagger");
const client_1 = require("@prisma/client");
const chat_gateway_1 = require("./domains/chat/gateway/chat.gateway");
const chat_service_1 = require("./domains/chat/service/chat.service");
const chat_room_service_1 = require("./domains/chat/service/chat-room.service");
const chat_room_member_service_1 = require("./domains/chat/service/chat-room-member.service");
const message_service_1 = require("./domains/chat/service/message.service");
const chat_room_repository_impl_1 = require("./domains/chat/repository/chat-room.repository.impl");
const chat_room_member_repository_impl_1 = require("./domains/chat/repository/chat-room-member.repository.impl");
const message_repository_impl_1 = require("./domains/chat/repository/message.repository.impl");
const follower_repository_impl_1 = require("./domains/follower/repository/follower.repository.impl");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const db = new client_1.PrismaClient();
const chatRoomRepository = new chat_room_repository_impl_1.ChatRoomRepositoryImpl(db);
const chatRoomMemberRepository = new chat_room_member_repository_impl_1.ChatRoomMemberRepositoryImpl(db);
const messageRepository = new message_repository_impl_1.MessageRepositoryImpl(db);
const followerRepository = new follower_repository_impl_1.FollowerRepositoryImpl(db);
const chatRoomService = new chat_room_service_1.ChatRoomService(chatRoomRepository, chatRoomMemberRepository, messageRepository, followerRepository);
const chatRoomMemberService = new chat_room_member_service_1.ChatRoomMemberService(chatRoomMemberRepository, chatRoomRepository);
const messageService = new message_service_1.MessageService(messageRepository, chatRoomMemberRepository);
const chatService = new chat_service_1.ChatService(chatRoomService, chatRoomMemberService, messageService, followerRepository);
const chatGateway = new chat_gateway_1.ChatGateway(httpServer, chatService);
if (_utils_1.Constants.NODE_ENV === _utils_1.NodeEnv.DEV) {
    app.use((0, morgan_1.default)('tiny'));
}
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: _utils_1.Constants.CORS_WHITELIST
}));
(0, swagger_1.setupSwagger)(app);
app.use('/api', _router_1.router);
app.use(errors_1.ErrorHandling);
httpServer.listen(_utils_1.Constants.PORT, () => {
    logger_1.Logger.info(`Server listening on port ${_utils_1.Constants.PORT}`);
    logger_1.Logger.info(`API Documentation available at http://localhost:${_utils_1.Constants.PORT}/api-docs`);
    logger_1.Logger.info(`Socket.IO chat server enabled`);
});
//# sourceMappingURL=server.js.map