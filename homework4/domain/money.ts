export enum Currencies {
    Rub = 'RUB',
    Eur = 'EUR',
    Usd = 'USD'
}

export class Money {
  constructor(
    readonly currency: Currencies,
    private readonly cents: number,
  ) {
    if (!Number.isInteger(cents)) {
      throw new Error("Money cents must be an integer");
    }

    if (cents < 0) {
      throw new Error("Money cents must be non-negative");
    }
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.cents === other.cents;
  }

  lessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.cents < other.cents;
  }

  moreThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.cents > other.cents;
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.currency, this.cents + other.cents);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);

    if (this.cents < other.cents) {
      throw new Error("Money result can not be negative");
    }

    return new Money(this.currency, this.cents - other.cents);
  }

  multiply(multiplier: number): Money {
    if (!Number.isInteger(multiplier) || multiplier < 0) {
      throw new Error("Money multiplier must be a non-negative integer");
    }
    return new Money(this.currency, this.cents * multiplier);
  }

  percent(percent: number): Money {
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error("Money percent must be from 0 to 100");
    }

    return new Money(this.currency, Math.round((this.cents * percent) / 100));
  }

  toString(): string {
    return `${this.cents / 100} ${this.currency}`;
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error("Cannot operate on money with different currencies");
    }
  }
}
