import { Currencies } from "../domain/money";

export interface ILogger {
  log(message: unknown): void;
}

export interface INotificationSender {
  send(message: string): Promise<void>;
}

export interface ProductDto {
    id: string;
    currency: Currencies;
    priceInCents: number;
}

export interface OrderLineDto {
  product: ProductDto;
  quantity: number;
}

export interface OrderDto {
  id: string;
  customerID: string;
  maxCount: number;
  orderLines: Array<OrderLineDto>;
}