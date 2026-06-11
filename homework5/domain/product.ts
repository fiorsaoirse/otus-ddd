import { Money } from "./money";
import { ProductID } from "./product-id";

export class Product {
  readonly id: ProductID;
  readonly price: Money;

  constructor(id: ProductID, price: Money) {
    this.id = id;
    this.price = price;
  }

  equals(product: Product): boolean {
    return this.id === product.id && this.price.equals(product.price);
  }
}