import { DomainEvent } from "../../domain/events/domain-event";
import { OrderConfirmedEvent } from "../../domain/events/order-confirmed";
import { ILogger, INotificationSender } from "../types";
import { IDomainEventHandler } from "./types";

export class OrderConfirmedHandler implements IDomainEventHandler<OrderConfirmedEvent> {
    constructor(
        private readonly notificationSender: INotificationSender,
        private readonly logger: ILogger
    ) {}

    handle(event: Readonly<DomainEvent<OrderConfirmedEvent>>): void {
        const { payload } = event;
        const message = `Order ${payload.orderId.id} was created! Total price: ${payload.orderPrice.toString()}`;
        this.sendMessage(message);
    }

    private async sendMessage(message: string): Promise<void> {
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
