type OrderConfirmedEvent = {
  type: "OrderConfirmedEvent";
  orderId: string;
  occurredAt: string;
};

type OrderShippedEvent = {
  type: "OrderShippedEvent";
  orderId: string;
  occurredAt: string;
};

type OrderHistoryEvent = OrderConfirmedEvent | OrderShippedEvent;

interface IOrderHistoryRepository {
  markAsConfirmed(orderId: string, confirmedAt: string): Promise<void>;
  markAsShipped(orderId: string, shippedAt: string): Promise<void>;
}

export class OrderHistoryProjector {
  constructor(
    private readonly orderHistoryRepository: IOrderHistoryRepository,
  ) {}

  async handle(event: OrderHistoryEvent): Promise<void> {
    switch (event.type) {
      case "OrderConfirmedEvent":
        await this.handleConfirmed(event);
        return;
      case "OrderShippedEvent":
        await this.handleShipped(event);
        return;
    }
  }

  private async handleConfirmed(event: OrderConfirmedEvent): Promise<void> {
    await this.orderHistoryRepository.markAsConfirmed(
      event.orderId,
      event.occurredAt,
    );
  }

  private async handleShipped(event: OrderShippedEvent): Promise<void> {
    await this.orderHistoryRepository.markAsShipped(
      event.orderId,
      event.occurredAt,
    );
  }
}
