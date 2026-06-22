import { describe, expect, it } from "vitest";

import { Currencies, Money } from "../../domain/money";
import { Product } from "../../domain/product";
import { WarehouseProductAdapter, WarenhouseProduct } from "./warehouse-product-adapter";

const createWarehouseProduct = (override: Partial<WarenhouseProduct> = {}): WarenhouseProduct => {
  return {
    id: "product-1",
    name: "Keyboard",
    comment: "Mechanical keyboard",
    priceAmount: 12500,
    priceCurrency: 840,
    sizeX: 30,
    sizeY: 12,
    sizeZ: 4,
    weight: 900,
    ...override,
  };
};

describe("WarehouseProductAdapter", () => {
  it("maps dirty warehouse product DTO to domain Product", () => {
    const adapter = new WarehouseProductAdapter();

    const product = adapter.toDomain(createWarehouseProduct());

    expect(product).toBeInstanceOf(Product);
    expect(product.id.id).toBe("product-1");
    expect(product.name).toBe("Keyboard");
    expect(product.description).toBe("Mechanical keyboard");
    expect(product.price.equals(new Money(Currencies.Usd, 12500))).toBe(true);
  });

  it("throws when warehouse currency code is not supported", () => {
    const adapter = new WarehouseProductAdapter();

    expect(() => adapter.toDomain(createWarehouseProduct({ priceCurrency: 999 })))
      .toThrow("Unsupported warehouse currency code: 999");
  });
});
