// Simple logger utility to replace console.log and provide better formatting
// and log levels.

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const getTimestamp = () => new Date().toISOString();

const formatMessage = (level: LogLevel, message: string, meta?: any) => {
    const timestamp = getTimestamp();
    const metaString = meta ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaString}`;
};

export const logger = {
    info: (message: string, meta?: any) => {
        console.log(formatMessage('info', message, meta));
    },
    warn: (message: string, meta?: any) => {
        console.warn(formatMessage('warn', message, meta));
    },
    error: (message: string, meta?: any) => {
        console.error(formatMessage('error', message, meta));
    },
    debug: (message: string, meta?: any) => {
        // Only log debug messages in development
        if (process.env.NODE_ENV !== 'production') {
            console.debug(formatMessage('debug', message, meta));
        }
    }
};
