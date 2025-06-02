"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BodyValidation = void 0;
const class_validator_1 = require("class-validator");
const errors_1 = require("./errors");
const class_transformer_1 = require("class-transformer");
function BodyValidation(target) {
    return async (req, res, next) => {
        req.body = (0, class_transformer_1.plainToInstance)(target, req.body);
        const errors = await (0, class_validator_1.validate)(req.body, {
            whitelist: true,
            forbidNonWhitelisted: true
        });
        if (errors.length > 0) {
            throw new errors_1.ValidationException(errors.map(error => ({ ...error, target: undefined, value: undefined })));
        }
        next();
    };
}
exports.BodyValidation = BodyValidation;
//# sourceMappingURL=validation.js.map