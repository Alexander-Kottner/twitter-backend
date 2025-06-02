"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Constants = exports.LogLevel = exports.NodeEnv = void 0;
var NodeEnv;
(function (NodeEnv) {
    NodeEnv["DEV"] = "development";
    NodeEnv["PROD"] = "production";
})(NodeEnv = exports.NodeEnv || (exports.NodeEnv = {}));
var LogLevel;
(function (LogLevel) {
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
class Constants {
    static NODE_ENV = process.env.NODE_ENV || NodeEnv.DEV;
    static LOG_LEVEL = process.env.LOG_LEVEL || LogLevel.INFO;
    static PORT = process.env.PORT ?? '8080';
    static CORS_WHITELIST = process.env.CORS_WHITELIST ?? '*';
    static TOKEN_SECRET = process.env.JWT_SECRET ?? 'secret';
}
exports.Constants = Constants;
//# sourceMappingURL=constants.js.map