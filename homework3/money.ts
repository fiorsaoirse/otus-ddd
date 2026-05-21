enum Currencies {
    Rub = 'RUB',
    Eur = 'EUR',
    Usd = 'USD'
}

export class Money {
    constructor(readonly currency: Currencies, readonly cents: number) {
        if (!Number.isInteger(cents)) {
            throw new Error('Money cents must be an integer');
        }

        if (cents < 0) {
            throw new Error('Money cents must be non-negative');
        }
    }

    equals(other: Money): boolean {
        return this.currency === other.currency && this.cents === other.cents;
    }

    add(other: Money): Money {
        this.ensureSameCurrency(other);
        return new Money(this.currency, this.cents + other.cents);
    }

    multiply(multiplier: number): Money {
        if (!Number.isInteger(multiplier) || multiplier < 0) {
            throw new Error('Money multiplier must be a non-negative integer');
        }
        return new Money(this.currency, this.cents * multiplier);
    }

    private ensureSameCurrency(other: Money): void {
        if (this.currency !== other.currency) {
            throw new Error('Cannot operate on money with different currencies');
        }
    }
}