import { Customer } from "../models/customer.js";

export async function upsertCustomer(input: {
  tenantId: string;
  name?: string;
  email?: string;
  phone?: string;
  locationId?: string;
}) {
  const query = input.phone
    ? { tenantId: input.tenantId, phone: input.phone }
    : input.email
      ? { tenantId: input.tenantId, email: input.email }
      : null;

  let customer = query ? await Customer.findOne(query) : null;

  if (!customer) {
    customer = await Customer.create({
      tenantId: input.tenantId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      mostRecentLocationId: input.locationId,
    });
    return customer;
  }

  if (input.name) customer.name = input.name;
  if (input.email) customer.email = input.email;
  if (input.phone) customer.phone = input.phone;
  if (input.locationId) customer.mostRecentLocationId = input.locationId;
  await customer.save();
  return customer;
}
