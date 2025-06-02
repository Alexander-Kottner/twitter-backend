import { Request, Response } from 'express';
export declare const generateAccessToken: (payload: Record<string, string | boolean | number>) => string;
export declare const withAuth: (req: Request, res: Response, next: () => any) => void;
export declare const encryptPassword: (password: string) => Promise<string>;
export declare const checkPassword: (password: string, hash: string) => Promise<boolean>;
