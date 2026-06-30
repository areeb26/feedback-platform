import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  exportCustomersUrl,
  fetchCustomers,
  formatCustomerDate,
  type Customer,
} from "../../api/customers";

export function CustomersPage() {
  const { slug = "" } = useParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers(slug)
      .then(setCustomers)
      .catch(() => setError("Could not load customers"));
  }, [slug]);

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1>Customers</h1>
        <a href={exportCustomersUrl(slug)}>Export</a>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Email</th>
            <th align="left">Phone Number</th>
            <th align="left">Most Recent Location</th>
            <th align="left">Created At</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.name ?? ""}</td>
              <td>{customer.email ?? ""}</td>
              <td>{customer.phone ?? ""}</td>
              <td>{customer.mostRecentLocation ?? ""}</td>
              <td>{formatCustomerDate(customer.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 16 }}>
        Showing 1 - {customers.length} of {customers.length} record(s).
      </p>
    </div>
  );
}
