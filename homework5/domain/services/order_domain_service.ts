import { Customer } from "../customer";
import { Discount } from "../discount";
import { Order } from "../order";
import { Promocode } from "../promocode";

const CLUB_DISCOUNT_PERCENT = 5;
const NO_DISCOUNT_PERCENT = 0;
const MAX_DISCOUNT_PERCENT = 100;

interface CalculateForCustomerParams {
  order: Order;
  customer: Customer;
  promocode?: Promocode;
}

export class DiscountService {
  calculateForCustomer({ order, customer, promocode }: CalculateForCustomerParams): Discount {
    if (promocode?.isExpired()) {
      throw new Error("Promocode can not be applied to the order, it is expired");
    }

    const orderPrice = order.getTotalPrice();
    const clubDiscount =
      customer.level === "vip" ? orderPrice.percent(CLUB_DISCOUNT_PERCENT) : orderPrice.percent(NO_DISCOUNT_PERCENT);

    const orderPriceAfterClubDiscount = orderPrice.subtract(clubDiscount);

    if (promocode?.minOrderPrice && orderPriceAfterClubDiscount.lessThan(promocode.minOrderPrice)) {
      throw new Error("Promocode can not be applied to that order");
    }

    const promocodeDiscount = orderPriceAfterClubDiscount.percent(promocode?.discountPercent ?? NO_DISCOUNT_PERCENT);
    const totalDiscount = clubDiscount.add(promocodeDiscount);
    const clubDiscountPercent = customer.level === "vip" ? CLUB_DISCOUNT_PERCENT : NO_DISCOUNT_PERCENT;
    const totalDiscountPercent = Math.min(
      clubDiscountPercent + (promocode?.discountPercent ?? NO_DISCOUNT_PERCENT),
      MAX_DISCOUNT_PERCENT,
    );

    return new Discount(totalDiscount, totalDiscountPercent);
  }
}
