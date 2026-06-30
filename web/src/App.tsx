import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { CreateTenantPage } from "./pages/admin/CreateTenantPage";
import { TenantsPage } from "./pages/admin/TenantsPage";
import { HomePage } from "./pages/HomePage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tenants/new" element={<CreateTenantPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
