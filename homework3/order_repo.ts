import { Order } from "./order";
import { ID } from "./types";
export interface IOrderRepository {
  findById(id: ID): Promise<Order | null>;
  findByCustomer(customerID: ID): Promise<Array<Order>>;
  saveOrder(order: Order): Promise<void>;
}
