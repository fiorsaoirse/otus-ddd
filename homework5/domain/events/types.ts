import type { DomainEvent } from "./domain-event";

export interface DomainEventPayload<TType extends string = string> {
  readonly type: TType;
}

export type DomainEventType = DomainEventPayload["type"];

export interface IDispatchable {
  pullEvents(): ReadonlyArray<Readonly<DomainEvent>>;
  addEvent(event: Readonly<DomainEvent>): void;
  clearEvents(): void;
}
