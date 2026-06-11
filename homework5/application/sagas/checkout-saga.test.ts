import { describe, expect, it, vi } from "vitest";

import { Currencies } from "../../domain/money";
import { NotificationService } from "../services/notification-service";
import { IOrderService } from "../services/order-service";
import { ILogger, INotificationSender } from "../types";
import {
  CheckoutCommand,
  CheckoutSaga,
  IInventoryService,
  IPaymentsService,
} from "./checkout-saga";

const command: CheckoutCommand = {
  customerId: "customer-1",
  items: [{ productId: "product-1", quantity: 2 }],
  payment: {
    paymentMethodId: "payment-method-1",
    amountCents: 10000,
    currency: Currencies.Usd,
  },
  sagaId: "saga-1",
};

const createDeps = () => {
  const orders: IOrderService = {
    loadOrder: vi.fn().mockResolvedValue(null),
    createOrder: vi.fn().mockResolvedValue("order-1"),
    confirmOrder: vi.fn().mockResolvedValue(undefined),
    cancelOrder: vi.fn().mockResolvedValue(undefined),
  };

  const inventory: IInventoryService = {
    reserveItems: vi.fn().mockResolvedValue("reservation-1"),
    releaseReservation: vi.fn().mockResolvedValue(undefined),
  };

  const payments: IPaymentsService = {
    authorizePayment: vi.fn().mockResolvedValue("payment-1"),
    capturePayment: vi.fn().mockResolvedValue(undefined),
    cancelPaymentAuthorization: vi.fn().mockResolvedValue(undefined),
    refundPayment: vi.fn().mockResolvedValue(undefined),
  };

  const logger: ILogger = {
    log: vi.fn(),
  };

  const notificationSender: INotificationSender = {
    send: vi.fn().mockResolvedValue(undefined),
  };

  const notifications = new NotificationService(notificationSender, logger);

  return { orders, inventory, payments, notifications, notificationSender, logger };
};

describe("CheckoutSaga", () => {
  it("runs checkout happy path across orders, inventory, payments, and notifications", async () => {
    const deps = createDeps();
    const saga = new CheckoutSaga(deps);

    await expect(saga.execute(command)).resolves.toEqual({
      orderId: "order-1",
      reservationId: "reservation-1",
      paymentId: "payment-1",
    });

    expect(deps.orders.createOrder).toHaveBeenCalledWith(command);
    expect(deps.inventory.reserveItems).toHaveBeenCalledWith("order-1", command.items);
    expect(deps.payments.authorizePayment).toHaveBeenCalledWith("order-1", command.payment);
    expect(deps.payments.capturePayment).toHaveBeenCalledWith("payment-1");
    expect(deps.orders.confirmOrder).toHaveBeenCalledWith("order-1");
    expect(deps.notificationSender.send).toHaveBeenCalledWith("Order order-1 was confirmed");

    expect(deps.payments.cancelPaymentAuthorization).not.toHaveBeenCalled();
    expect(deps.payments.refundPayment).not.toHaveBeenCalled();
    expect(deps.inventory.releaseReservation).not.toHaveBeenCalled();
    expect(deps.orders.cancelOrder).not.toHaveBeenCalled();
  });

  it("compensates created order and reserved items when payment authorization fails", async () => {
    const deps = createDeps();
    const error = new Error("payment authorization failed");
    vi.mocked(deps.payments.authorizePayment).mockRejectedValue(error);
    const saga = new CheckoutSaga(deps);

    await expect(saga.execute(command)).rejects.toBe(error);

    expect(deps.orders.createOrder).toHaveBeenCalledWith(command);
    expect(deps.inventory.reserveItems).toHaveBeenCalledWith("order-1", command.items);
    expect(deps.payments.authorizePayment).toHaveBeenCalledWith("order-1", command.payment);

    expect(deps.payments.cancelPaymentAuthorization).not.toHaveBeenCalled();
    expect(deps.payments.refundPayment).not.toHaveBeenCalled();
    expect(deps.inventory.releaseReservation).toHaveBeenCalledWith("reservation-1");
    expect(deps.orders.cancelOrder).toHaveBeenCalledWith("order-1", "payment authorization failed");
    expect(deps.notificationSender.send).toHaveBeenCalledWith("Order order-1 failed: payment authorization failed");
    expect(deps.orders.confirmOrder).not.toHaveBeenCalled();
  });

  it("cancels payment authorization when capture fails", async () => {
    const deps = createDeps();
    const error = new Error("payment capture failed");
    vi.mocked(deps.payments.capturePayment).mockRejectedValue(error);
    const saga = new CheckoutSaga(deps);

    await expect(saga.execute(command)).rejects.toBe(error);

    expect(deps.payments.cancelPaymentAuthorization).toHaveBeenCalledWith("payment-1");
    expect(deps.payments.refundPayment).not.toHaveBeenCalled();
    expect(deps.inventory.releaseReservation).toHaveBeenCalledWith("reservation-1");
    expect(deps.orders.cancelOrder).toHaveBeenCalledWith("order-1", "payment capture failed");
  });

  it("refunds captured payment when order confirmation fails", async () => {
    const deps = createDeps();
    const error = new Error("order confirmation failed");
    vi.mocked(deps.orders.confirmOrder).mockRejectedValue(error);
    const saga = new CheckoutSaga(deps);

    await expect(saga.execute(command)).rejects.toBe(error);

    expect(deps.payments.refundPayment).toHaveBeenCalledWith("payment-1");
    expect(deps.payments.cancelPaymentAuthorization).not.toHaveBeenCalled();
    expect(deps.inventory.releaseReservation).toHaveBeenCalledWith("reservation-1");
    expect(deps.orders.cancelOrder).toHaveBeenCalledWith("order-1", "order confirmation failed");
  });
});
