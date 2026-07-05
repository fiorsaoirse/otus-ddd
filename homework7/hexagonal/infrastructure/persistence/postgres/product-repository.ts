import { IProductRepository } from "../../../application/ports/product/product-repository";
import { Product } from "../../../domain/product/product";
import { ProductID } from "../../../domain/product/product-id";
import { Currencies, Money } from "../../../domain/value-objects/money";

interface ProductOrmRecord {
    id: string;
    name: string;
    description: string | null;
    priceCents: number;
    priceCurrency: Currencies;
}

interface ProductOrmClient {
    product: {
        findUnique(params: { where: { id: string } }): Promise<ProductOrmRecord | null>;
        create(params: { data: ProductOrmRecord }): Promise<ProductOrmRecord>;
        update(params: { where: { id: string }; data: Omit<ProductOrmRecord, "id"> }): Promise<ProductOrmRecord>;
        delete(params: { where: { id: string } }): Promise<void>;
    };
}

export class ProductRepository implements IProductRepository {
    constructor(private readonly orm: ProductOrmClient) {}
    
    async get(id: ProductID): Promise<Product | null> {
        const record = await this.orm.product.findUnique({
            where: { id: id.id },
        });

        if (!record) {
            return null;
        }

        return this.toDomain(record);
    }

    async create(product: Product): Promise<ProductID | null> {
        const record = await this.orm.product.create({
            data: this.toPersistence(product),
        });

        return new ProductID(record.id);
    }

    async update(product: Product): Promise<void> {
        const { id, ...data } = this.toPersistence(product);

        await this.orm.product.update({
            where: { id },
            data,
        });
    }

    async delete(id: ProductID): Promise<void> {
        await this.orm.product.delete({
            where: { id: id.id },
        });
    }

    private toDomain(record: ProductOrmRecord): Product {
        return new Product(
            new ProductID(record.id),
            new Money(record.priceCurrency, record.priceCents),
            record.name,
            record.description ?? undefined,
        );
    }

    private toPersistence(product: Product): ProductOrmRecord {
        const price = product.price.toPrimitives();

        return {
            id: product.id.id,
            name: product.name,
            description: product.description ?? null,
            priceCents: price.cents,
            priceCurrency: price.currency,
        };
    }
}
