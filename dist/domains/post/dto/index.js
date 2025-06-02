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
exports.UpdatePostImagesDTO = exports.PostImageUploadDTO = exports.ExtendedPostDTO = exports.PostDTO = exports.CreatePostInputDTO = exports.CreatePostImageDTO = exports.PostImageDTO = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class PostImageDTO {
    constructor(image) {
        this.id = image.id;
        this.postId = image.postId;
        this.s3Key = image.s3Key;
        this.index = image.index;
        this.createdAt = image.createdAt;
        this.url = image.url;
    }
    id;
    postId;
    s3Key;
    index;
    createdAt;
    url;
}
exports.PostImageDTO = PostImageDTO;
class CreatePostImageDTO {
    postId;
    s3Key;
    index;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePostImageDTO.prototype, "postId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePostImageDTO.prototype, "s3Key", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(3),
    __metadata("design:type", Number)
], CreatePostImageDTO.prototype, "index", void 0);
exports.CreatePostImageDTO = CreatePostImageDTO;
class CreatePostInputDTO {
    content;
    parentId;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(240),
    __metadata("design:type", String)
], CreatePostInputDTO.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePostInputDTO.prototype, "parentId", void 0);
exports.CreatePostInputDTO = CreatePostInputDTO;
class PostDTO {
    constructor(post) {
        this.id = post.id;
        this.authorId = post.authorId;
        this.content = post.content;
        this.createdAt = post.createdAt;
        this.parentId = post.parentId;
        this.likeCount = post.likeCount || 0;
        this.retweetCount = post.retweetCount || 0;
        this.images = post.images || [];
    }
    id;
    authorId;
    content;
    createdAt;
    parentId;
    likeCount;
    retweetCount;
    images;
}
exports.PostDTO = PostDTO;
class ExtendedPostDTO extends PostDTO {
    constructor(post) {
        super(post);
        this.author = post.author;
        this.qtyComments = post.qtyComments;
        this.qtyLikes = post.qtyLikes;
        this.qtyRetweets = post.qtyRetweets;
        this.hasLiked = post.hasLiked;
        this.hasRetweeted = post.hasRetweeted;
        this.comments = post.comments;
    }
    author;
    qtyComments;
    qtyLikes;
    qtyRetweets;
    hasLiked;
    hasRetweeted;
    comments;
}
exports.ExtendedPostDTO = ExtendedPostDTO;
class PostImageUploadDTO {
    postId;
    fileExt;
    index;
    constructor(postId, fileExt, index) {
        this.postId = postId;
        this.fileExt = fileExt;
        this.index = index;
    }
}
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PostImageUploadDTO.prototype, "postId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PostImageUploadDTO.prototype, "fileExt", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(3),
    __metadata("design:type", Number)
], PostImageUploadDTO.prototype, "index", void 0);
exports.PostImageUploadDTO = PostImageUploadDTO;
class UpdatePostImagesDTO {
    postId;
    images;
    constructor(postId, images) {
        this.postId = postId;
        this.images = images;
    }
}
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePostImagesDTO.prototype, "postId", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_validator_1.ArrayMaxSize)(4),
    (0, class_transformer_1.Type)(() => CreatePostImageDTO),
    __metadata("design:type", Array)
], UpdatePostImagesDTO.prototype, "images", void 0);
exports.UpdatePostImagesDTO = UpdatePostImagesDTO;
//# sourceMappingURL=index.js.map