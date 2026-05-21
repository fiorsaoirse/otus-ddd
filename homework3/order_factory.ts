import { Customer } from "./customer";
import { Order } from "./order";
import { ID } from "./types";

export interface IOrderFactory {
  create(id: ID, customer: Customer): Order;
}

export class OrderFactory implements IOrderFactory {
  create(id: ID, customer: Customer): Order {
    // Бизнес-логика в фабрике (чтобы она была анемичной, иначе в ней нет особого смысла)
    const maxCount = customer.level === "vip" ? 20 : 10;
    return Order.create(id, customer.id, maxCount);
  }
}
