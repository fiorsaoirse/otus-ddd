import { DomainEvent } from "../domain/events/domain-event";
import { DomainEventPayload, DomainEventType } from "../domain/events/types";
import { IDomainEventHandler } from "./handlers/types";

export interface IDispatcher {
    dispatch(events: ReadonlyArray<Readonly<DomainEvent>>): void;
}

export interface IHandlerRegistry {
    register<TPayload extends DomainEventPayload>(type: TPayload["type"], handler: IDomainEventHandler<TPayload>): void;
    unregister<TPayload extends DomainEventPayload>(type: TPayload["type"], handler: IDomainEventHandler<TPayload>): void;
}

export class DomainEventsDispatcher implements IDispatcher, IHandlerRegistry {
    private readonly map: Map<DomainEventType, Array<IDomainEventHandler>>;

    constructor () {
        this.map = new Map();
    }

    dispatch(events: ReadonlyArray<Readonly<DomainEvent>>): void {
        for (const event of events) {
            const handlers = this.map.get(event.payload.type);
            if (handlers) {
                for (const handler of handlers) {
                    handler.handle(event);
                }
            }
        }
    }

    register<TPayload extends DomainEventPayload>(type: TPayload["type"], handler: IDomainEventHandler<TPayload>): void {
        if (!this.map.has(type)) {
            this.map.set(type, []);
        }

        const handlers = this.map.get(type);
        handlers!.push(handler as IDomainEventHandler);
    }

    unregister<TPayload extends DomainEventPayload>(type: TPayload["type"], hander: IDomainEventHandler<TPayload>): void {
        const handlers = this.map.get(type) ?? [];
        const filtered = handlers.filter((h) => h !== hander);

        this.map.set(type, filtered);
    }
}
