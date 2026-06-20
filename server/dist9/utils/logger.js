"use strict";
// Simple logger utility to replace console.log and provide better formatting
// and log levels.
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const getTimestamp = () => new Date().toISOString();
const formatMessage = (level, message, meta) => {
    const timestamp = getTimestamp();
    const metaString = meta ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaString}`;
};
exports.logger = {
    info: (message, meta) => {
        console.log(formatMessage('info', message, meta));
    },
    warn: (message, meta) => {
        console.warn(formatMessage('warn', message, meta));
    },
    error: (message, meta) => {
        console.error(formatMessage('error', message, meta));
    },
    debug: (message, meta) => {
        // Only log debug messages in development
        if (process.env.NODE_ENV !== 'production') {
            console.debug(formatMessage('debug', message, meta));
        }
    }
};
//# sourceMappingURL=logger.js.map