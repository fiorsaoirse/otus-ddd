import { Money } from "./money";

export class Discount {
    constructor(
        readonly amount: Money,
        readonly percent: number,
    ) {
        if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
            throw new Error('Discount percent must be from 0 to 100');
        }
    }
}
