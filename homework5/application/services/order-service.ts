import { Order } from "../../domain/order";
import { OrderID } from "../../domain/order-id";
import { IDispatcher } from "../dispatcher";
import { IOrderRepository } from "../order_repo";
import { ILogger } from "../types";

export interface CreateOrderItem {
    productId: string;
    quantity: number;
}

export interface CreateOrderCommand {
    customerId: string;
    items: ReadonlyArray<CreateOrderItem>;
}

export interface IOrderService {
    loadOrder(id: OrderID): Promise<Order | null>;
    createOrder(command: CreateOrderCommand): Promise<string>;
    confirmOrder(id: OrderID | string): Promise<void>;
    cancelOrder(id: OrderID | string, reason: string): Promise<void>;
}

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

    async confirmOrder(id: OrderID | string): Promise<void> {
        try {
            const orderId = this.toOrderId(id);
            const order = await this.orderRepository.findById(orderId);
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

    async cancelOrder(id: OrderID | string, reason: string): Promise<void> {
        try {
            const orderId = this.toOrderId(id);
            const order = await this.orderRepository.findById(orderId);
            if (!order) {
                return Promise.reject(`Can't cancel order with id ${id}, it doesn't exist`);
            }

            order.updateStatus("cancelled");
            await this.orderRepository.saveOrder(order);
            // Тут аналогично выгружаем события и делаем dispatch
            const events = order.pullEvents();
            this.dipatcher.dispatch(events);

            this.logger.log(`Order ${id} was cancelled. Reason: ${reason}`);
        } catch (error: unknown) {
            this.logger.log(error);
            return Promise.reject(error);
        }
    }

    private toOrderId(id: OrderID | string): OrderID {
        return typeof id === "string" ? new OrderID(id) : id;
    }
}
