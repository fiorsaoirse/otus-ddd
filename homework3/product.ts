import { Money } from "./money";
import { ID } from "./types";

export class Product {
    readonly id: ID;
    readonly price: Money;

    constructor(id: ID, price: Money) {
        this.id = id;
        this.price = price;
    }
}