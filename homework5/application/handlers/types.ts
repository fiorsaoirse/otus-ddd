import { DomainEvent } from "../../domain/events/domain-event";
import { DomainEventPayload } from "../../domain/events/types";

export interface IDomainEventHandler<T extends DomainEventPayload = DomainEventPayload> {
    handle(event: Readonly<DomainEvent<T>>): void;
}
