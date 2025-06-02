"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const signale_1 = require("signale");
const constants_1 = require("./constants");
const options = {
    disabled: false,
    interactive: false,
    logLevel: constants_1.Constants.LOG_LEVEL
};
exports.Logger = new signale_1.Signale(options);
//# sourceMappingURL=logger.js.map