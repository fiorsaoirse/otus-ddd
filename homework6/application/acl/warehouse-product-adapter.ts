import { Currencies, Money } from "../../domain/money";
import { Product } from "../../domain/product";
import { ProductID } from "../../domain/product-id";

export interface WarenhouseProduct {
  id: string;
  name: string;
  comment: string;
  priceAmount: number;
  priceCurrency: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  weight: number;
}

export class WarehouseProductAdapter {
  toDomain(dto: WarenhouseProduct): Product {
    return new Product(
      new ProductID(dto.id),
      new Money(this.toCurrency(dto.priceCurrency), dto.priceAmount),
      dto.name,
      dto.comment || undefined,
    );
  }

  private toCurrency(value: number): Currencies {
    switch (value) {
      case 643:
        return Currencies.Rub;
      case 978:
        return Currencies.Eur;
      case 840:
        return Currencies.Usd;
      default:
        throw new Error(`Unsupported warehouse currency code: ${value}`);
    }
  }
}
