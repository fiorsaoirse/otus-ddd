import { Order } from "../../../domain/order/order";

export interface IOrderRepository {
    save(order: Order): Promise<void>;
}
