import { ILogger, INotificationSender } from "../types";

export interface INotificationService {
    sendMessage(message: string): Promise<void>;
}

export class NotificationService {
    constructor(
        private readonly notificationSender: INotificationSender,
        private readonly logger: ILogger
    ) {}

    async sendMessage(message: string): Promise<void> {
        try {
            await this.notificationSender.send(message);
            this.logger.log('Successfully sent a message!');
            return;
        } catch (error: unknown) {
            this.logger.log(error);
            return Promise.reject();
        }
    }
}
