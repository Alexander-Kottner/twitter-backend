"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerConfigurationError = exports.RateLimitError = exports.NotFoundError = exports.ValidationError = exports.AuthorizationError = exports.AuthenticationError = exports.ChatError = void 0;
class ChatError extends Error {
    code;
    statusCode;
    constructor(message, code, statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'ChatError';
    }
}
exports.ChatError = ChatError;
class AuthenticationError extends ChatError {
    constructor(message = 'Authentication required') {
        super(message, 'AUTHENTICATION_REQUIRED', 401);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends ChatError {
    constructor(message = 'Access denied') {
        super(message, 'ACCESS_DENIED', 403);
    }
}
exports.AuthorizationError = AuthorizationError;
class ValidationError extends ChatError {
    constructor(message) {
        super(message, 'VALIDATION_ERROR', 400);
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends ChatError {
    constructor(message = 'Resource not found') {
        super(message, 'NOT_FOUND', 404);
    }
}
exports.NotFoundError = NotFoundError;
class RateLimitError extends ChatError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 'RATE_LIMIT_EXCEEDED', 429);
    }
}
exports.RateLimitError = RateLimitError;
class ServerConfigurationError extends ChatError {
    constructor(message = 'Server configuration error') {
        super(message, 'SERVER_CONFIGURATION_ERROR', 500);
    }
}
exports.ServerConfigurationError = ServerConfigurationError;
//# sourceMappingURL=errors.dto.js.map