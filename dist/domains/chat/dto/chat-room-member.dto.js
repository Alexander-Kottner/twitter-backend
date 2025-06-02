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
exports.UpdateLastReadDTO = exports.RemoveMemberFromChatRoomDTO = exports.ChatRoomMemberDTO = exports.AddMemberToChatRoomDTO = void 0;
const class_validator_1 = require("class-validator");
class AddMemberToChatRoomDTO {
    chatRoomId;
    userId;
    constructor(data) {
        this.chatRoomId = data.chatRoomId;
        this.userId = data.userId;
    }
}
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddMemberToChatRoomDTO.prototype, "chatRoomId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddMemberToChatRoomDTO.prototype, "userId", void 0);
exports.AddMemberToChatRoomDTO = AddMemberToChatRoomDTO;
class ChatRoomMemberDTO {
    constructor(member) {
        this.id = member.id;
        this.chatRoomId = member.chatRoomId;
        this.userId = member.userId;
        this.joinedAt = member.joinedAt;
        this.lastReadAt = member.lastReadAt ?? undefined;
        if (member.user) {
            this.user = {
                id: member.user.id,
                username: member.user.username,
                name: member.user.name ?? undefined,
                profilePicture: member.user.profilePicture ?? undefined,
            };
        }
        if (member.chatRoom) {
            this.chatRoom = member.chatRoom;
        }
    }
    id;
    chatRoomId;
    userId;
    joinedAt;
    lastReadAt;
    user;
    chatRoom;
}
exports.ChatRoomMemberDTO = ChatRoomMemberDTO;
class RemoveMemberFromChatRoomDTO {
    chatRoomId;
    userId;
    constructor(data) {
        this.chatRoomId = data.chatRoomId;
        this.userId = data.userId;
    }
}
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RemoveMemberFromChatRoomDTO.prototype, "chatRoomId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RemoveMemberFromChatRoomDTO.prototype, "userId", void 0);
exports.RemoveMemberFromChatRoomDTO = RemoveMemberFromChatRoomDTO;
class UpdateLastReadDTO {
    chatRoomId;
    userId;
    lastReadAt;
    constructor(data) {
        this.chatRoomId = data.chatRoomId;
        this.userId = data.userId;
        this.lastReadAt = data.lastReadAt;
    }
}
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLastReadDTO.prototype, "chatRoomId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLastReadDTO.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], UpdateLastReadDTO.prototype, "lastReadAt", void 0);
exports.UpdateLastReadDTO = UpdateLastReadDTO;
//# sourceMappingURL=chat-room-member.dto.js.map