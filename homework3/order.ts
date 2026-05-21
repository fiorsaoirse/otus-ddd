import { Money } from "./money";
import { Product } from "./product";
import { ID } from "./types";

class OrderLine {
    readonly product: Product;
    quantity: number;

    constructor(product: Product, quantity: number) {
        if (quantity < 0) {
            throw new Error('The quantity of products must be positive');
        }

        this.product = product;
        this.quantity = quantity;
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

  constructor({ id, customerID, orderLines = [], maxCount = 10 }: OrderInitProps) {
    this.id = id;
    this.customerID = customerID;
    this.orderLines = orderLines;
    this.maxCount = maxCount;
  }

  addItem(product: Product, quantity: number): void {
    const currentCount = this.orderLines.reduce((acc, o) => acc + o.quantity, 0);
    const isCountMoreThanAllowed = currentCount + quantity > this.maxCount;

    if (isCountMoreThanAllowed) {
      throw new Error(`Order can not contain more than ${this.maxCount} items`);
    }

    const item = new OrderLine(product, quantity);
    this.orderLines.push(item);
  }

  getTotalPrice(): Money {
    const priceProPosition = this.orderLines.map((o) => o.product.price.multiply(o.quantity));
    return priceProPosition.reduce((acc, current) => {
      return acc.add(current);
    });
  }
}