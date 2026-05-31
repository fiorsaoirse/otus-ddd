import { Order } from "../../domain/order";
import { OrderID } from "../../domain/order-id";
import { IDispatcher } from "../dispatcher";
import { IOrderRepository } from "../order_repo";
import { ILogger } from "../types";

export class OrderConfirmationService {
    constructor(
        private readonly orderRepository: IOrderRepository, 
        private readonly dipatcher: IDispatcher,
        private readonly logger: ILogger
    ) {}

    async loadOrder(id: OrderID): Promise<Order | null> {
        try {
            return await this.orderRepository.findById(id);
        } catch (error: unknown) {
            this.logger.log(error);
            return Promise.reject(error);
        }
    }

    async confirmOrder(id: OrderID): Promise<void> {
        try {
            const order = await this.orderRepository.findById(id);
            if (!order) {
                return Promise.reject(`Can't confirm order with id ${id}, it doesn't exist`);
            }
            order.confirm();
            await this.orderRepository.saveOrder(order);
            const events = order.pullEvents();
            this.dipatcher.dispatch(events);
        } catch (error: unknown) {
            this.logger.log(error);
            return Promise.reject(error);
        }
    }
}
