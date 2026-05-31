import { Order } from "../domain/order";
import { OrderID } from "../domain/order-id";

export interface IOrderRepository {
  findById(id: OrderID): Promise<Order | null>;
  saveOrder(order: Order): Promise<void>;
}
