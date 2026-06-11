import { Currencies } from "../../domain/money";
import { INotificationService } from "../services/notification-service";
import { IOrderService } from "../services/order-service";
import { ILogger } from "../types";

export interface CheckoutItem {
  productId: string;
  quantity: number;
}

export interface PaymentDetails {
  paymentMethodId: string;
  amountCents: number;
  currency: Currencies;
}

export interface CheckoutCommand {
  customerId: string;
  items: ReadonlyArray<CheckoutItem>;
  payment: PaymentDetails;
  sagaId: string;
}

export interface CheckoutResult {
  orderId: string;
  reservationId: string;
  paymentId: string;
}

export interface IInventoryService {
  reserveItems(orderId: string, items: ReadonlyArray<CheckoutItem>): Promise<string>;
  releaseReservation(reservationId: string): Promise<void>;
}

export interface IPaymentsService {
  authorizePayment(orderId: string, payment: PaymentDetails): Promise<string>;
  capturePayment(paymentId: string): Promise<void>;
  cancelPaymentAuthorization(paymentId: string): Promise<void>;
  refundPayment(paymentId: string): Promise<void>;
}

interface CheckoutSagaDeps {
  orders: IOrderService;
  inventory: IInventoryService;
  payments: IPaymentsService;
  notifications: INotificationService;
  logger: ILogger;
}

export class CheckoutSaga {
  constructor(private readonly deps: CheckoutSagaDeps) {}

  async execute(command: CheckoutCommand): Promise<CheckoutResult> {
    let orderId: string | undefined;
    let reservationId: string | undefined;
    let paymentId: string | undefined;
    let paymentCaptured = false;

    try {
      orderId = await this.deps.orders.createOrder(command);
      reservationId = await this.deps.inventory.reserveItems(orderId, command.items);
      paymentId = await this.deps.payments.authorizePayment(orderId, command.payment);

      await this.deps.payments.capturePayment(paymentId);
      paymentCaptured = true;

      await this.deps.orders.confirmOrder(orderId);

      try {
        await this.deps.notifications.sendMessage(`Order ${orderId} was confirmed`);
      } catch (error: unknown) {
        this.deps.logger.log(error);
      }

      return { orderId, reservationId, paymentId };
    } catch (error: unknown) {
      await this.compensate({
        error,
        orderId,
        reservationId,
        paymentId,
        paymentCaptured,
      });

      throw error;
    }
  }

  private async compensate({
    error,
    orderId,
    reservationId,
    paymentId,
    paymentCaptured,
  }: {
    error: unknown;
    orderId?: string;
    reservationId?: string;
    paymentId?: string;
    paymentCaptured: boolean;
  }): Promise<void> {
    const reason = error instanceof Error ? error.message : "Checkout failed";

    if (paymentId) {
      await this.runCompensation(() => paymentCaptured
        ? this.deps.payments.refundPayment(paymentId)
        : this.deps.payments.cancelPaymentAuthorization(paymentId));
    }

    if (reservationId) {
      await this.runCompensation(() => this.deps.inventory.releaseReservation(reservationId));
    }

    if (orderId) {
      await this.runCompensation(() => this.deps.orders.cancelOrder(orderId, reason));
      await this.runCompensation(() => this.deps.notifications.sendMessage(`Order ${orderId} failed: ${reason}`));
    }
  }

  private async runCompensation(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error: unknown) {
      this.deps.logger.log(error);
    }
  }
}
