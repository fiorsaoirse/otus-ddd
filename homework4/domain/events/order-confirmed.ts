import { CustomerID } from "../customer-id";
import { Money } from "../money";
import { OrderID } from "../order-id";
import { EventID } from "./event-id";

export class OrderConfirmedEvent {
    constructor(
        readonly orderId: OrderID,
        readonly customerId: CustomerID,
        readonly orderPrice: Money
    ) {}
}