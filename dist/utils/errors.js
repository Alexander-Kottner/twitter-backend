"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandling = exports.ConflictException = exports.NotFoundException = exports.ForbiddenException = exports.ValidationException = exports.BadRequestException = exports.UnauthorizedException = void 0;
const http_status_1 = __importDefault(require("http-status"));
const logger_1 = require("../utils/logger");
class HttpException extends Error {
    code;
    message;
    error;
    constructor(code, message, error) {
        super(message);
        this.code = code;
        this.message = message;
        this.error = error;
    }
}
class UnauthorizedException extends HttpException {
    constructor(errorCode) {
        super(http_status_1.default.UNAUTHORIZED, 'Unauthorized. You must login to access this content.', { error_code: errorCode });
    }
}
exports.UnauthorizedException = UnauthorizedException;
class BadRequestException extends HttpException {
    constructor(message = 'Bad Request') {
        super(http_status_1.default.BAD_REQUEST, message);
    }
}
exports.BadRequestException = BadRequestException;
class ValidationException extends HttpException {
    constructor(errors) {
        super(http_status_1.default.BAD_REQUEST, 'Validation Error', errors);
    }
}
exports.ValidationException = ValidationException;
class ForbiddenException extends HttpException {
    constructor(message = 'Forbidden. You are not allowed to perform this action') {
        super(http_status_1.default.FORBIDDEN, message);
    }
}
exports.ForbiddenException = ForbiddenException;
class NotFoundException extends HttpException {
    constructor(model) {
        super(http_status_1.default.NOT_FOUND, `Not found.${model ? " Couldn't find " + model : ''}`);
    }
}
exports.NotFoundException = NotFoundException;
class ConflictException extends HttpException {
    constructor(errorCode) {
        super(http_status_1.default.CONFLICT, 'Conflict', { error_code: errorCode });
    }
}
exports.ConflictException = ConflictException;
function ErrorHandling(error, req, res, next) {
    if (!error)
        next(error);
    if (error instanceof HttpException) {
        if (error.code === http_status_1.default.INTERNAL_SERVER_ERROR) {
            logger_1.Logger.error(error.message);
        }
        return res.status(error.code).json({ message: error.message, code: error.code, errors: error.error });
    }
    logger_1.Logger.error(error.message);
    return res.status(http_status_1.default.INTERNAL_SERVER_ERROR).json({ message: error.message, code: 500 });
}
exports.ErrorHandling = ErrorHandling;
//# sourceMappingURL=errors.js.map