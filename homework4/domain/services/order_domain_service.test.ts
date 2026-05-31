import { afterEach, describe, expect, it, vi } from "vitest";

import { Customer } from "../customer";
import { Currencies, Money } from "../money";
import { DiscountService } from "./order_domain_service";
import { Order } from "../order";
import { Product } from "../product";
import { Promocode } from "../promocode";
import { OrderID } from "../order-id";
import { CustomerID } from "../customer-id";
import { ProductID } from "../product-id";

const createFutureDate = (daysFromNow: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);

  return date;
};

const createOrder = (): Order => {
  const order = Order.create(new OrderID("order-1"), new CustomerID("customer-1"));
  order.addItem(new Product(new ProductID("product-1"), new Money(Currencies.Usd, 10000)), 1);

  return order;
};

const createCustomer = (level: "plain" | "vip"): Customer => {
  return new Customer(new CustomerID("customer-1"), level, new Date("2026-01-01"));
};

const createPromocode = (
  discountPercent: number,
  minOrderPrice?: Money,
  validFrom = createFutureDate(1),
  validTo = createFutureDate(30),
): Promocode => {
  return new Promocode(validFrom, validTo, discountPercent, minOrderPrice);
};

describe("DiscountService", () => {
  const service = new DiscountService();

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates discount for plain customer with 10 percent promocode", () => {
    const discount = service.calculateForCustomer({
      order: createOrder(),
      customer: createCustomer("plain"),
      promocode: createPromocode(10),
    });

    expect(discount.amount.equals(new Money(Currencies.Usd, 1000))).toBe(true);
    expect(discount.percent).toBe(10);
  });

  it("calculates discount for vip customer with 10 percent promocode", () => {
    const discount = service.calculateForCustomer({
      order: createOrder(),
      customer: createCustomer("vip"),
      promocode: createPromocode(10),
    });

    expect(discount.amount.equals(new Money(Currencies.Usd, 1450))).toBe(true);
    expect(discount.percent).toBe(15);
  });

  it("calculates discount for plain customer without promocode", () => {
    const discount = service.calculateForCustomer({
      order: createOrder(),
      customer: createCustomer("plain"),
    });

    expect(discount.amount.equals(new Money(Currencies.Usd, 0))).toBe(true);
    expect(discount.percent).toBe(0);
  });

  it("calculates discount for vip customer without promocode", () => {
    const discount = service.calculateForCustomer({
      order: createOrder(),
      customer: createCustomer("vip"),
    });

    expect(discount.amount.equals(new Money(Currencies.Usd, 500))).toBe(true);
    expect(discount.percent).toBe(5);
  });

  it("throws when promocode is expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01"));

    const promocode = createPromocode(10, undefined, new Date("2026-01-02"), new Date("2026-01-03"));

    vi.setSystemTime(new Date("2026-01-04"));

    expect(() => service.calculateForCustomer({
      order: createOrder(),
      customer: createCustomer("plain"),
      promocode,
    })).toThrow("Promocode can not be applied to the order, it is expired");
  });

  it("throws when order price is lower than promocode minimum order price", () => {
    expect(() => service.calculateForCustomer({
      order: createOrder(),
      customer: createCustomer("plain"),
      promocode: createPromocode(10, new Money(Currencies.Usd, 10001)),
    })).toThrow("Promocode can not be applied to that order");
  });

  it("checks promocode minimum order price after club discount", () => {
    expect(() => service.calculateForCustomer({
      order: createOrder(),
      customer: createCustomer("vip"),
      promocode: createPromocode(10, new Money(Currencies.Usd, 9600)),
    })).toThrow("Promocode can not be applied to that order");
  });
});
