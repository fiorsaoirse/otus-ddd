import { Money } from "./money";

enum PromocodeStatus {
    Active = "Active",
    Expired = "Expired"
}

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

        if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100) {
            throw new Error('Promocode discount percent must be an integer from 1 to 100');
        }
    }

    isExpired(): boolean {
        const now = Date.now();
        const to = this.validTo.getTime();

        return to < now;
    }
}
