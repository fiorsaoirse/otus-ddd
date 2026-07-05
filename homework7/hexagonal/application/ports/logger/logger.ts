export interface ILogger {
    log(message: {
        context: string;
        type: "ERROR" | "WARNING" | "INFO";
        content: unknown;
    }): void;
}
