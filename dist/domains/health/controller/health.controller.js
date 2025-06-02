"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const http_status_1 = __importDefault(require("http-status"));
require("express-async-errors");
const database_1 = require("../../../utils/database");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/', async (req, res) => {
    try {
        await database_1.db.$queryRaw `SELECT 1`;
        return res.status(http_status_1.default.OK).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'unknown',
            database: 'connected',
        });
    }
    catch (error) {
        console.error('Health check failed:', error);
        return res.status(http_status_1.default.SERVICE_UNAVAILABLE).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown database error',
            details: process.env.NODE_ENV === 'production' ? undefined : error,
        });
    }
});
//# sourceMappingURL=health.controller.js.map