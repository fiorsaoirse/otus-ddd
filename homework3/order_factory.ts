import { Order } from "./order";

export interface OrderDto {

}

export interface IOrderFactory {
    create(dto: OrderDto): Order;
}

export class OrderFactory implements IOrderFactory {
    create(dto: OrderDto): Order {
        throw new Error("Method not implemented.");
    }
}