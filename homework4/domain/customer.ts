import { CustomerID } from "./customer-id";

export interface ICustomerRepository {
    getById(id: CustomerID): Promise<Customer | null>;
}

type CustomerLevel = "vip" | "plain";

const MIN_REGISTRATION_AGE_DAYS = 10;
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

export class Customer {
  readonly id: CustomerID;
  private _level: CustomerLevel;
  private readonly registeredAt: Date;

  constructor(id: CustomerID, level: CustomerLevel, registeredAt: Date) {
    this.id = id;
    this._level = level;
    this.registeredAt = registeredAt;
  }

  get level(): CustomerLevel {
    return this._level;
  }

  updateLevel(targetLevel: CustomerLevel): void {
    const now = new Date();
    const registrationAgeDays = (now.getTime() - this.registeredAt.getTime()) / MILLISECONDS_IN_DAY;

    // Бизнес-правило для примера, чтобы агрегат не был анемичный 🙂
    if (registrationAgeDays < MIN_REGISTRATION_AGE_DAYS) {
      throw new Error(`Level can be changed only after ${MIN_REGISTRATION_AGE_DAYS} registration days`);
    }

    if (this.level === targetLevel) {
      return;
    }

    this._level = targetLevel;
  }


}
