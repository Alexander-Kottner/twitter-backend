import { NextFunction, Request, Response } from 'express';
import { ClassType } from '../types';
export declare function BodyValidation<T>(target: ClassType<T>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
