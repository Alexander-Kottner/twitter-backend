import { NextFunction, Request, Response } from 'express';
declare abstract class HttpException extends Error {
    readonly code: number;
    readonly message: string;
    readonly error?: object | object[] | undefined;
    constructor(code: number, message: string, error?: object | object[] | undefined);
}
export declare class UnauthorizedException extends HttpException {
    constructor(errorCode?: string);
}
export declare class BadRequestException extends HttpException {
    constructor(message?: string);
}
export declare class ValidationException extends HttpException {
    constructor(errors: object[]);
}
export declare class ForbiddenException extends HttpException {
    constructor(message?: string);
}
export declare class NotFoundException extends HttpException {
    constructor(model?: string);
}
export declare class ConflictException extends HttpException {
    constructor(errorCode?: string);
}
export declare function ErrorHandling(error: Error, req: Request, res: Response, next: NextFunction): Response;
export {};
