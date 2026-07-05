import type { DomainEvent } from "../../../domain/events/domain-event";

export interface IDomainEventPublisher {
    publish(events: ReadonlyArray<Readonly<DomainEvent>>): Promise<void>;
}
