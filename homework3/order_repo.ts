import { Order } from "./order";
import { ID } from "./types";

export interface IOrderRepository {
    getById(id: ID): Promise<Order | null>;
    getAllCustomerOrders(customerID: ID): Promise<Array<Order>>;
}