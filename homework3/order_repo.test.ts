import { Order } from "./order";
import { IOrderRepository } from "./order_repo";

const createOrder = (id: string, customerID: string): Order => {
  return new Order({ id, customerID });
};

export const createOrderRepository = (initial: Array<Order> = []): IOrderRepository => {
  const orders = [...initial];

  return {
    getById(id) {
      const item = orders.find((order) => order.id === id) ?? null;
      return Promise.resolve(item);
    },
    getAllCustomerOrders(customerID) {
      const items = orders.filter((o) => o.customerID === customerID);
      return Promise.resolve(items);
    },
  } satisfies IOrderRepository;
};

describe("Order Repository", () => {
  it("returns an order by id", async () => {
    const order = createOrder("order-1", "customer-1");
    const repository = createOrderRepository([order]);

    await expect(repository.getById("order-1")).resolves.toBe(order);
  });

  it("returns null when order id does not exist", async () => {
    const repository = createOrderRepository([
      createOrder("order-1", "customer-1"),
    ]);

    await expect(repository.getById("missing-order")).resolves.toBeNull();
  });

  it("returns all orders for a customer", async () => {
    const firstOrder = createOrder("order-1", "customer-1");
    const secondOrder = createOrder("order-2", "customer-2");
    const thirdOrder = createOrder("order-3", "customer-1");
    const repository = createOrderRepository([firstOrder, secondOrder, thirdOrder]);

    await expect(repository.getAllCustomerOrders("customer-1")).resolves.toEqual([
      firstOrder,
      thirdOrder,
    ]);
  });

  it("returns an empty list when customer has no orders", async () => {
    const repository = createOrderRepository([
      createOrder("order-1", "customer-1"),
    ]);

    await expect(repository.getAllCustomerOrders("customer-2")).resolves.toEqual([]);
  });

  it("does not include orders added to the initial array after creation", async () => {
    const initial = [createOrder("order-1", "customer-1")];
    const repository = createOrderRepository(initial);

    initial.push(createOrder("order-2", "customer-1"));

    await expect(repository.getAllCustomerOrders("customer-1")).resolves.toHaveLength(1);
    await expect(repository.getById("order-2")).resolves.toBeNull();
  });
});
