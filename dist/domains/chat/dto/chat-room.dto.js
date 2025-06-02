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
exports.UpdateChatRoomDTO = exports.ChatRoomSummaryDTO = exports.ChatRoomDTO = exports.CreateChatRoomDTO = exports.ChatRoomType = void 0;
const class_validator_1 = require("class-validator");
var ChatRoomType;
(function (ChatRoomType) {
    ChatRoomType["DM"] = "DM";
    ChatRoomType["GROUP"] = "GROUP";
})(ChatRoomType = exports.ChatRoomType || (exports.ChatRoomType = {}));
class CreateChatRoomDTO {
    name;
    type;
    memberIds;
    constructor(data) {
        this.name = data.name;
        this.type = data.type;
        this.memberIds = data.memberIds;
    }
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateChatRoomDTO.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(ChatRoomType),
    __metadata("design:type", String)
], CreateChatRoomDTO.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateChatRoomDTO.prototype, "memberIds", void 0);
exports.CreateChatRoomDTO = CreateChatRoomDTO;
class ChatRoomDTO {
    constructor(chatRoom) {
        this.id = chatRoom.id;
        this.name = chatRoom.name ?? undefined;
        this.type = chatRoom.type;
        this.createdAt = chatRoom.createdAt;
        this.updatedAt = chatRoom.updatedAt;
        this.members = chatRoom.members?.map(member => ({
            id: member.id,
            chatRoomId: member.chatRoomId,
            userId: member.userId,
            joinedAt: member.joinedAt,
            lastReadAt: member.lastReadAt,
            user: {
                id: member.user.id,
                username: member.user.username,
                name: member.user.name,
                profilePicture: member.user.profilePicture
            }
        }));
    }
    id;
    name;
    type;
    createdAt;
    updatedAt;
    members;
}
exports.ChatRoomDTO = ChatRoomDTO;
class ChatRoomSummaryDTO {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type;
        this.memberCount = data.memberCount;
        this.lastMessage = data.lastMessage;
        this.unreadCount = data.unreadCount;
    }
    id;
    name;
    type;
    memberCount;
    lastMessage;
    unreadCount;
}
exports.ChatRoomSummaryDTO = ChatRoomSummaryDTO;
class UpdateChatRoomDTO {
    name;
    constructor(data) {
        this.name = data.name;
    }
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateChatRoomDTO.prototype, "name", void 0);
exports.UpdateChatRoomDTO = UpdateChatRoomDTO;
//# sourceMappingURL=chat-room.dto.js.map