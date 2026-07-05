import { CustomerID } from "../../customer/customer-id";
import { Money } from "../../value-objects/money";
import { OrderID } from "../order-id";
import type { DomainEventPayload } from "../../events/types";

export type OrderConfirmedEventType = "OrderConfirmedEvent";

export class OrderConfirmedEvent implements DomainEventPayload<OrderConfirmedEventType> {
  readonly type: OrderConfirmedEventType = "OrderConfirmedEvent";

  constructor(
    readonly orderId: OrderID,
    readonly customerId: CustomerID,
    readonly orderPrice: Money,
  ) {}
}
