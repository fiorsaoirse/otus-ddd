import { describe, expect, it, vi } from "vitest";

import { CustomerID } from "../../domain/customer-id";
import { DomainEvent } from "../../domain/events/domain-event";
import { OrderConfirmedEvent } from "../../domain/events/order-confirmed";
import { Currencies, Money } from "../../domain/money";
import { Order } from "../../domain/order";
import { OrderID } from "../../domain/order-id";
import { Product } from "../../domain/product";
import { ProductID } from "../../domain/product-id";
import { IDispatcher } from "../dispatcher";
import { IOrderRepository } from "../order_repo";
import { ILogger } from "../types";
import { OrderConfirmationService } from "./order-service";

const orderId = new OrderID("order-1");
const customerId = new CustomerID("customer-1");

const createConfirmableOrder = (): Order => {
  const order = Order.create(orderId, customerId);
  order.addItem(new Product(new ProductID("product-1"), new Money(Currencies.Usd, 10000)), 1);
  order.updateStatus("paid");
  order.updateStatus("shipped");

  return order;
};

const createLogger = (): ILogger => {
  return {
    log: vi.fn(),
  };
};

const createDispatcher = (): IDispatcher => {
  return {
    dispatch: vi.fn(),
  };
};

const createOrderRepository = (order: Order | null): IOrderRepository => {
  return {
    findById: vi.fn().mockResolvedValue(order),
    saveOrder: vi.fn().mockResolvedValue(undefined),
  };
};

describe("OrderConfirmationService", () => {
  it("loads order by id", async () => {
    const order = createConfirmableOrder();
    const repository = createOrderRepository(order);
    const service = new OrderConfirmationService(repository, createDispatcher(), createLogger());

    await expect(service.loadOrder(orderId)).resolves.toBe(order);
    expect(repository.findById).toHaveBeenCalledWith(orderId);
  });

  it("confirms order, saves it, and dispatches pulled domain events", async () => {
    const order = createConfirmableOrder();
    const repository = createOrderRepository(order);
    const dispatcher = createDispatcher();
    const service = new OrderConfirmationService(repository, dispatcher, createLogger());

    await service.confirmOrder(orderId);

    expect(repository.findById).toHaveBeenCalledWith(orderId);
    expect(repository.saveOrder).toHaveBeenCalledWith(order);
    expect(dispatcher.dispatch).toHaveBeenCalledTimes(1);

    const [events] = vi.mocked(dispatcher.dispatch).mock.calls[0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(DomainEvent);
    expect(events[0].payload).toBeInstanceOf(OrderConfirmedEvent);

    const event = events[0] as DomainEvent<OrderConfirmedEvent>;
    expect(event.payload.type).toBe("OrderConfirmedEvent");
    expect(event.payload.orderId).toBe(orderId);
    expect(event.payload.customerId).toBe(customerId);
    expect(order.pullEvents()).toHaveLength(0);
  });

  it("rejects and does not save or dispatch when order does not exist", async () => {
    const repository = createOrderRepository(null);
    const dispatcher = createDispatcher();
    const logger = createLogger();
    const service = new OrderConfirmationService(repository, dispatcher, logger);

    await expect(service.confirmOrder(orderId)).rejects.toBe(`Can't confirm order with id ${orderId}, it doesn't exist`);
    expect(repository.saveOrder).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    expect(logger.log).not.toHaveBeenCalled();
  });

  it("logs and rejects repository loading errors", async () => {
    const error = new Error("database is unavailable");
    const repository = createOrderRepository(null);
    vi.mocked(repository.findById).mockRejectedValue(error);
    const logger = createLogger();
    const service = new OrderConfirmationService(repository, createDispatcher(), logger);

    await expect(service.loadOrder(orderId)).rejects.toBe(error);
    expect(logger.log).toHaveBeenCalledWith(error);
  });

  it("does not dispatch events when saving fails", async () => {
    const error = new Error("save failed");
    const repository = createOrderRepository(createConfirmableOrder());
    vi.mocked(repository.saveOrder).mockRejectedValue(error);
    const dispatcher = createDispatcher();
    const logger = createLogger();
    const service = new OrderConfirmationService(repository, dispatcher, logger);

    await expect(service.confirmOrder(orderId)).rejects.toBe(error);
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(error);
  });
});
