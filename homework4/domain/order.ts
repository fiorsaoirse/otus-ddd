import { CustomerID } from "./customer-id";
import { OrderConfirmedEvent } from "./events/order-confirmed";
import { DomainEvent } from "./events/domain-event";
import { Money } from "./money";
import { OrderID } from "./order-id";
import { Product } from "./product";
import { IDispatchable } from "./events/types";

type OrderStatus = 'new' | 'paid' | 'shipped' | 'confirmed' | 'cancelled';

const orderStatusStateMachine: Record<OrderStatus, Array<OrderStatus>> = {
  'new': ['paid', 'cancelled'],
  'paid': ['shipped', 'cancelled'],
  'shipped': ['confirmed'],
  'confirmed': [],
  'cancelled': []
}

class OrderLine {
  readonly product: Product;
  quantity: number;

  private constructor(product: Product, quantity: number) {
    if (quantity < 0) {
      throw new Error("The quantity of products must be positive");
    }

    this.product = product;
    this.quantity = quantity;
  }

  static create(product: Product, quantity: number): OrderLine {
    return new OrderLine(product, quantity);
  }

  update(quantity: number): void {
    if (quantity < 0) {
      throw new Error("The quantity of products must be positive");
    }

    this.quantity = quantity;
  }
}

interface OrderInitProps {
  id: OrderID;
  customerID: CustomerID;
  status: OrderStatus;
  orderLines?: Array<OrderLine>;
  maxCount?: number;
}

// тут можно будет добавлять типы других доменных событий
type OrderDomainEvent = DomainEvent<OrderConfirmedEvent>;
export class Order implements IDispatchable {
  private readonly maxCount: number;
  private readonly orderLines: Array<OrderLine>;

  private readonly events: Array<OrderDomainEvent>;
  private status: OrderStatus;

  readonly id: OrderID;
  readonly customerID: CustomerID;

  private constructor({ id, customerID, orderLines = [], maxCount = 10, status }: OrderInitProps) {
    if (maxCount < 1) {
      throw new Error("Max count must be positive");
    }

    if (!id || !customerID) {
      throw new Error("Ids must be not empty");
    }

    if (orderLines.length > maxCount) {
      throw new Error(`Order can't contain more items than ${maxCount}`);
    }

    this.id = id;
    this.customerID = customerID;
    this.orderLines = orderLines;
    this.maxCount = maxCount;
    this.status = status;

    this.events = [];
  }

  static create(id: OrderID, customerID: CustomerID, maxCount = 10): Order {
    return new Order({ id, customerID, maxCount, status: "new" });
  }

  addItem(product: Product, quantity: number): void {
    const orderList = this.orderLines.find((ol) => ol.product.equals(product));

    if (orderList) {
      orderList.update(orderList.quantity + quantity);
      return;
    }

    if (this.orderLines.length > this.maxCount) {
      throw new Error(`Order can not contain more items than ${this.maxCount} items`);
    }

    const item = OrderLine.create(product, quantity);
    this.orderLines.push(item);
  }

  getTotalPrice(): Money {
    const priceProPosition = this.orderLines.map((o) => o.product.price.multiply(o.quantity));
    return priceProPosition.reduce((acc, current) => {
      return acc.add(current);
    });
  }

  confirm(): void {
    this.updateStatus("confirmed");
    const orderEvent = new OrderConfirmedEvent(this.id, this.customerID, this.getTotalPrice());
    this.addEvent(new DomainEvent(orderEvent));
  }

  updateStatus(to: OrderStatus) {
    // Вообще по-хорошему такая штука должна решаться через finite state machine
    // но т.к. проект учебный, возьму подобие стейт машины и минимальное количество статусов
    const isInFiniteState = orderStatusStateMachine[this.status].length === 0;
    if (isInFiniteState) {
      throw new Error(`Order is in the finite state ${this.status}, can not be changed to ${to}`);
    }

    const possibleTransitions = orderStatusStateMachine[this.status];
    if (!possibleTransitions.includes(to)) {
      throw new Error(`The transition from ${this.status} to ${to} is unaviable`);
    }

    this.status = to;
  }

  pullEvents(): ReadonlyArray<Readonly<DomainEvent>> {
    const slice = [...this.events];
    this.clearEvents();

    return slice;
  }

  addEvent(event: Readonly<OrderDomainEvent>): void {
    this.events.push(event);
  }

  clearEvents(): void {
    this.events.length = 0;
  }
}
