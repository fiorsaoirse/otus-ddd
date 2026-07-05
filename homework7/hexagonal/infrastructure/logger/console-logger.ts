import { ILogger } from "../../application/ports/logger/logger";

export class ConsoleLogger implements ILogger {
    log(message: { context: string; type: "ERROR" | "WARNING" | "INFO"; content: unknown; }): void {
        if (message.type === "ERROR") {
            console.error(`[${message.context}]: ${message.content}`)
        }
    }
   
}
