import { ICustomerRepository } from "./customer";
import { Order } from "./order";
import { IOrderFactory } from "./order_factory";
import { IOrderRepository } from "./order_repo";
import { ID, ILogger } from "./types";

// Application service
export class OrderService {
    constructor(
        private readonly orderRepository: IOrderRepository, 
        private readonly customerRepository: ICustomerRepository,
        private readonly orderFactory: IOrderFactory,
        private readonly logger: ILogger
    ) {}

    async loadOrder(id: ID): Promise<Order | null> {
        try {
            return await this.orderRepository.findById(id);
        } catch (error: unknown) {
            this.logger.log(error);
            return Promise.reject(error);
        }
    }

    async createOrder(id: ID, customerID: ID): Promise<Order> {
        try {
            const customer = await this.customerRepository.getById(customerID);
            if (!customer) {
                throw new Error(`Customer with id ${customerID} doesn't exist`);
            }

            const order = this.orderFactory.create(id, customer);
            await this.orderRepository.saveOrder(order);
            return order;
        } catch (error: unknown) {
            this.logger.log(error);
            return Promise.reject(error);
        }
    }
}
