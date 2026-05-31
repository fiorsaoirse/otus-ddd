import { Money } from "./money";

const MIN_DISCOUNT_PERCENT = 1;
const MAX_DISCOUNT_PERCENT = 100;

export class Promocode {
    constructor(
        readonly validFrom: Date,
        readonly validTo: Date,
        readonly discountPercent: number,
        readonly minOrderPrice?: Money
    ) {
        const from = validFrom.getTime();
        const to = validTo.getTime();

        if (from >= to) {
            throw new Error('Promocode start can not be earier or equal promocode end');
        }

        const now = Date.now();
        if (from < now) {
            throw new Error('Promocode start can not be in the past');
        }

        if (
          !Number.isInteger(discountPercent) ||
          discountPercent < MIN_DISCOUNT_PERCENT ||
          discountPercent > MAX_DISCOUNT_PERCENT
        ) {
          throw new Error(
            `Promocode discount percent must be an integer from ${MIN_DISCOUNT_PERCENT} to ${MAX_DISCOUNT_PERCENT}`,
          );
        }
    }

    isExpired(): boolean {
        const now = Date.now();
        const to = this.validTo.getTime();

        return to < now;
    }
}
