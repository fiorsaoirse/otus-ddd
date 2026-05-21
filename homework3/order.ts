import { Money } from "./money";
import { Product } from "./product";
import { ID } from "./types";

export interface OrderLineDto {
  product: Product;
  quantity: number;
}

export interface OrderDto {
  id: ID;
  customerID: ID;
  maxCount: number;
  orderLines: Array<OrderLineDto>;
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

  static rehydrate({ product, quantity }: OrderLineDto): OrderLine {
    return new OrderLine(product, quantity);
  }
}

interface OrderInitProps {
  id: ID;
  customerID: ID;
  orderLines?: Array<OrderLine>;
  maxCount?: number;
}

export class Order {
  private readonly maxCount: number;
  private readonly orderLines: Array<OrderLine>;

  readonly id: ID;
  readonly customerID: ID;

  private constructor({ id, customerID, orderLines = [], maxCount = 10 }: OrderInitProps) {
    this.id = id;
    this.customerID = customerID;
    this.orderLines = orderLines;
    this.maxCount = maxCount;
  }

  static create(id: ID, customerID: ID, maxCount = 10): Order {
    return new Order({ id, customerID, maxCount });
  }

  static rehydrate({ id, customerID, orderLines, maxCount }: OrderDto): Order {
    return new Order({
      id,
      customerID,
      orderLines: orderLines.map((line) => OrderLine.rehydrate(line)),
      maxCount,
    });
  }

  addItem(product: Product, quantity: number): void {
    const currentCount = this.orderLines.reduce((acc, o) => acc + o.quantity, 0);
    const isCountMoreThanAllowed = currentCount + quantity > this.maxCount;

    if (isCountMoreThanAllowed) {
      throw new Error(`Order can not contain more than ${this.maxCount} items`);
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

  hydrate(): OrderDto {
    return {
      id: this.id,
      customerID: this.customerID,
      maxCount: this.maxCount,
      orderLines: this.orderLines.map(({ product, quantity }) => ({ product, quantity })),
    };
  }
}
