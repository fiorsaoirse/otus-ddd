import { ID } from "./types";

export interface ICustomerRepository {
    getById(id: ID): Promise<Customer | null>;
}

export interface Customer {
  id: ID;
  level: "vip" | "plain";
}