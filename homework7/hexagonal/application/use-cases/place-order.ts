import { Order } from "../../domain/order/order";
import { IDomainEventPublisher } from "../ports/events/domain-event-publisher";
import { ILogger } from "../ports/logger/logger";
import { IOrderRepository } from "../ports/order/order-repository";

export interface IPlaceOrderUseCase {
    execute(order: Order): Promise<void>;
}

export class PlaceOrderUseCase implements IPlaceOrderUseCase {
    // Самый примитивный DI - инъекция через конструктор.
    // В реальном приложении я бы предпочла использовать DI контейнер
    // (это может быть встроенный DI как в Angular/Springboot или с помощью библиотек, таких как tsyringe etc)
    constructor(
        private readonly orderRepository: IOrderRepository,
        private readonly eventPublisher: IDomainEventPublisher,
        private readonly logger: ILogger,
    ) {}

    async execute(order: Order): Promise<void> {
        try {
            await this.orderRepository.save(order);

            const events = order.pullEvents();
            if (events.length === 0) {
                return;
            }

            await this.eventPublisher.publish(events);
        } catch (error: unknown) {
            this.logger.log({
                context: "PlaceOrderUseCase",
                type: "ERROR",
                content: error,
            });
            throw error;
        }
    }
}
