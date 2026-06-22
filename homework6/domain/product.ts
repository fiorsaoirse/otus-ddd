import { Money } from "./money";
import { ProductID } from "./product-id";

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 20;

const MAX_DESCRIPTION_LENGTH = 100;

export class Product {
  readonly id: ProductID;
  readonly price: Money;
  
  private _name: string;
  private _description?: string;

  private static validateName(name: string): string {
    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
      throw new Error(`Product name can't be less ${MIN_NAME_LENGTH} and more then ${MAX_NAME_LENGTH}`)
    }

    return name;
  }

  private static validateDescription(description?: string): string | undefined {
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Product description can't be more than ${MAX_DESCRIPTION_LENGTH}`)
    }

    return description;
  }

  constructor(id: ProductID, price: Money, name: string, description?: string) {
    this.id = id;
    this.price = price;
    this._name = Product.validateName(name);
    this._description = Product.validateDescription(description);
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  equals(product: Product): boolean {
    return this.id === product.id && this.price.equals(product.price);
  }

  updateName(value: string): void {
    this._name = Product.validateName(value);
  }

  updateDescription(value: string): void {
    this._description = Product.validateDescription(value);
  }

}
