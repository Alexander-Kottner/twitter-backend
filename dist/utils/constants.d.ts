export declare enum NodeEnv {
    DEV = "development",
    PROD = "production"
}
export declare enum LogLevel {
    INFO = "info",
    DEBUG = "debug",
    WARN = "warn",
    ERROR = "error"
}
export declare class Constants {
    static NODE_ENV: NodeEnv;
    static LOG_LEVEL: LogLevel;
    static PORT: string;
    static CORS_WHITELIST: string;
    static TOKEN_SECRET: string;
}
