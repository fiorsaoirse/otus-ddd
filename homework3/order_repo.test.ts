import { Customer } from "./customer";
import { Currencies, Money } from "./money";
import { Order, OrderDto } from "./order";
import { IOrderFactory, OrderFactory } from "./order_factory";
import { IOrderRepository } from "./order_repo";
import { Product } from "./product";

const customer: Customer = { id: "customer-1", level: "plain" };

const createOrderDto = (id: string, customerID: string): OrderDto => {
  return { id, customerID, maxCount: 10, orderLines: [] };
};

const createOrder = (id: string, customerID: string): Order => {
  return Order.create(id, customerID);
};

const createOrderFactory = (): IOrderFactory => {
  return new OrderFactory();
};

const createOrderRepository = (initial: Array<OrderDto> = []): IOrderRepository => {
  const orders = [...initial];

  return {
    findById(id) {
      const item = orders.find((order) => order.id === id);
      return Promise.resolve(item ? Order.rehydrate(item) : null);
    },
    findByCustomer(customerID) {
      const items = orders
        .filter((o) => o.customerID === customerID)
        .map((order) => Order.rehydrate(order));
      return Promise.resolve(items);
    },
    saveOrder(order) {
      orders.push(order.hydrate());
      return Promise.resolve();
    },
  } satisfies IOrderRepository;
};

describe("Order Repository", () => {
  it("returns an order by id", async () => {
    const order = createOrder("order-1", "customer-1");
    const repository = createOrderRepository([createOrderDto(order.id, order.customerID)]);

    const target = await repository.findById("order-1");

    expect(target).toEqual(order);
  });

  it("returns null when order id does not exist", async () => {
    const repository = createOrderRepository([createOrderDto("order-1", "customer-1")]);

    await expect(repository.findById("missing-order")).resolves.toBeNull();
  });

  it("returns all orders for a customer", async () => {
    const firstOrder = createOrder("order-1", "customer-1");
    const secondOrder = createOrder("order-2", "customer-2");
    const thirdOrder = createOrder("order-3", "customer-1");
    const repository = createOrderRepository([
      createOrderDto(firstOrder.id, firstOrder.customerID),
      createOrderDto(secondOrder.id, secondOrder.customerID),
      createOrderDto(thirdOrder.id, thirdOrder.customerID),
    ]);

    await expect(repository.findByCustomer("customer-1")).resolves.toEqual([firstOrder, thirdOrder]);
  });

  it("returns an empty list when customer has no orders", async () => {
    const repository = createOrderRepository([createOrderDto("order-1", "customer-1")]);

    await expect(repository.findByCustomer("customer-2")).resolves.toEqual([]);
  });

  it("does not include orders added to the initial array after creation", async () => {
    const initial = [createOrderDto("order-1", "customer-1")];
    const repository = createOrderRepository(initial);

    initial.push(createOrderDto("order-2", "customer-1"));

    await expect(repository.findByCustomer("customer-1")).resolves.toHaveLength(1);
    await expect(repository.findById("order-2")).resolves.toBeNull();
  });

  it("saves and rehydrates order state", async () => {
    const product = new Product("product-1", new Money(Currencies.Usd, 500));
    const factory = createOrderFactory();
    const order = factory.create("order-1", customer);
    order.addItem(product, 2);

    const repository = createOrderRepository();

    await repository.saveOrder(order);
    const target = await repository.findById("order-1");

    expect(target).toEqual(order);
    expect(target?.getTotalPrice().equals(new Money(Currencies.Usd, 1000))).toBe(true);
  });
});
