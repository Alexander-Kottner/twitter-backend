export declare class ChatError extends Error {
    code: string;
    statusCode: number;
    constructor(message: string, code: string, statusCode?: number);
}
export declare class AuthenticationError extends ChatError {
    constructor(message?: string);
}
export declare class AuthorizationError extends ChatError {
    constructor(message?: string);
}
export declare class ValidationError extends ChatError {
    constructor(message: string);
}
export declare class NotFoundError extends ChatError {
    constructor(message?: string);
}
export declare class RateLimitError extends ChatError {
    constructor(message?: string);
}
export declare class ServerConfigurationError extends ChatError {
    constructor(message?: string);
}
