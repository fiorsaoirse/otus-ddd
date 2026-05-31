import { EventID } from "./event-id";
import type { DomainEventPayload } from "./types";

export class DomainEvent<TPayload extends DomainEventPayload = DomainEventPayload> {
    readonly id: EventID;

    constructor(readonly payload: TPayload, readonly metadata: Record<string, string> = {}) {
        this.id = new EventID(Math.random().toString());
    }
}
