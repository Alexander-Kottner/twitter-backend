"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetMessagesDTO = exports.MessageResponseDTO = exports.MessageDTO = exports.CreateMessageDTO = exports.MessageType = void 0;
const class_validator_1 = require("class-validator");
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "TEXT";
    MessageType["IMAGE"] = "IMAGE";
    MessageType["FILE"] = "FILE";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
class CreateMessageDTO {
    chatRoomId;
    authorId;
    content;
    type;
    iv;
    tag;
    isEncrypted;
    constructor(data) {
        this.chatRoomId = data.chatRoomId;
        this.authorId = data.authorId;
        this.content = data.content;
        this.type = data.type || MessageType.TEXT;
        this.iv = data.iv;
        this.tag = data.tag;
        this.isEncrypted = data.isEncrypted;
    }
}
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMessageDTO.prototype, "chatRoomId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMessageDTO.prototype, "authorId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMessageDTO.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(MessageType),
    __metadata("design:type", String)
], CreateMessageDTO.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMessageDTO.prototype, "iv", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMessageDTO.prototype, "tag", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateMessageDTO.prototype, "isEncrypted", void 0);
exports.CreateMessageDTO = CreateMessageDTO;
class MessageDTO {
    constructor(message) {
        this.id = message.id;
        this.chatRoomId = message.chatRoomId;
        this.authorId = message.authorId;
        this.content = message.content;
        this.type = message.type;
        this.isEncrypted = message.isEncrypted || false;
        this.iv = message.iv || undefined;
        this.tag = message.tag || undefined;
        this.createdAt = message.createdAt;
        this.updatedAt = message.updatedAt;
        if (message.author) {
            this.author = {
                id: message.author.id,
                username: message.author.username,
                name: message.author.name ?? undefined,
                profilePicture: message.author.profilePicture ?? undefined
            };
        }
    }
    id;
    chatRoomId;
    authorId;
    content;
    type;
    isEncrypted;
    iv;
    tag;
    createdAt;
    updatedAt;
    author;
}
exports.MessageDTO = MessageDTO;
class MessageResponseDTO {
    constructor(data) {
        this.message = data.message;
        this.chatRoom = data.chatRoom;
    }
    message;
    chatRoom;
}
exports.MessageResponseDTO = MessageResponseDTO;
class GetMessagesDTO {
    chatRoomId;
    limit;
    cursor;
    constructor(data) {
        this.chatRoomId = data.chatRoomId;
        this.limit = data.limit;
        this.cursor = data.cursor;
    }
}
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetMessagesDTO.prototype, "chatRoomId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], GetMessagesDTO.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetMessagesDTO.prototype, "cursor", void 0);
exports.GetMessagesDTO = GetMessagesDTO;
//# sourceMappingURL=message.dto.js.map