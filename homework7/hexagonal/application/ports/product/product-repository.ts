import { Product } from "../../../domain/product/product";
import { ProductID } from "../../../domain/product/product-id";

export interface IProductRepository {
    get(id: ProductID): Promise<Product | null>;
    create(product: Product): Promise<ProductID | null>;
    update(product: Product): Promise<void>;
    delete(id: ProductID): Promise<void>;
}