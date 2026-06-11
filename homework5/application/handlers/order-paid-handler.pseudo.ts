import { DomainEvent } from "../../domain/events/domain-event";
import { DomainEventPayload } from "../../domain/events/types";
import { INotificationService } from "../services/notification-service";
import { ILogger } from "../types";

export interface OrderPaidEvent extends DomainEventPayload<"OrderPaidEvent"> {
  readonly type: "OrderPaidEvent";
  readonly orderId: string;
  readonly customerId: string;
  readonly paidAmountCents: number;
  readonly currency: string;
}

export interface IProcessedEventCache {
  /**
   * Redis-like SET key value NX EX ttl.
   * Returns true only when the current handler successfully reserves this event id.
   */
  tryReserve(eventId: string, ttlSeconds: number): Promise<boolean>;
  markProcessed(eventId: string, ttlSeconds: number): Promise<void>;
  release(eventId: string): Promise<void>;
}

export interface IProcessedEventStore {
  /**
   * Durable storage, for example PostgreSQL table processed_events.
   */
  exists(eventId: string): Promise<boolean>;
  save(eventId: string, eventType: string, processedAt: Date): Promise<void>;
}

const PROCESSED_EVENT_CACHE_TTL_SECONDS = 60 * 60;

export class OrderPaidNotificationHandler {
  constructor(
    private readonly processedEventCache: IProcessedEventCache,
    private readonly processedEventStore: IProcessedEventStore,
    private readonly notificationService: INotificationService,
    private readonly logger: ILogger,
  ) {}

  async handle(event: Readonly<DomainEvent<OrderPaidEvent>>): Promise<void> {
    const eventId = event.id.id;
    const cacheKey = `processed-events:${eventId}`;

    const reservationAcquired = await this.processedEventCache.tryReserve(
      cacheKey,
      PROCESSED_EVENT_CACHE_TTL_SECONDS,
    );

    if (!reservationAcquired) {
      this.logger.log(`OrderPaidEvent ${eventId} was already handled or is being handled`);
      return;
    }

    try {
      const alreadyProcessed = await this.processedEventStore.exists(eventId);
      if (alreadyProcessed) {
        await this.processedEventCache.markProcessed(cacheKey, PROCESSED_EVENT_CACHE_TTL_SECONDS);
        return;
      }

      await this.notificationService.sendMessage(
        `Order ${event.payload.orderId} was paid. Amount: ${event.payload.paidAmountCents} ${event.payload.currency}`,
      );

      await this.processedEventStore.save(eventId, event.payload.type, new Date());
      await this.processedEventCache.markProcessed(cacheKey, PROCESSED_EVENT_CACHE_TTL_SECONDS);
    } catch (error: unknown) {
      await this.processedEventCache.release(cacheKey);
      this.logger.log(error);
      throw error;
    }
  }
}
