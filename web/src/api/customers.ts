import { customerSchema, type Customer } from "@feedback-platform/shared";
import { apiFetch } from "./http";
import { tenantBase } from "./tenantHttp";

const customerListSchema = customerSchema.array();


export async function fetchCustomers(slug: string): Promise<Customer[]> {
  const response = await apiFetch(`${tenantBase(slug)}/customers`);
  if (!response.ok) {
    throw new Error("Failed to load customers");
  }
  return customerListSchema.parse(await response.json());
}

export function exportCustomersUrl(slug: string) {
  return `${tenantBase(slug)}/customers/export`;
}

export function formatCustomerDate(isoDate: string) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
