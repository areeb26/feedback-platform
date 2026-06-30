import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { CreateTenantPage } from "./pages/admin/CreateTenantPage";
import { TenantsPage } from "./pages/admin/TenantsPage";
import { HomePage } from "./pages/HomePage";
import { TenantLayout } from "./layouts/TenantLayout";
import { LocationsPage } from "./pages/tenant/LocationsPage";
import { OverviewPage } from "./pages/tenant/OverviewPage";
import { PlaceholderPage } from "./pages/tenant/PlaceholderPage";
import { SurveyPreviewPage } from "./pages/public/SurveyPreviewPage";
import { SurveysPage } from "./pages/tenant/SurveysPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/s/:previewSlug" element={<SurveyPreviewPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tenants/new" element={<CreateTenantPage />} />
        </Route>
        <Route path="/t/:slug" element={<TenantLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="customers" element={<PlaceholderPage title="Customers" />} />
          <Route path="incidents" element={<PlaceholderPage title="Incidents" />} />
          <Route
            path="analytics/incidents"
            element={<PlaceholderPage title="Incident Analytics" />}
          />
          <Route path="listings" element={<PlaceholderPage title="Listings" />} />
          <Route path="reviews" element={<PlaceholderPage title="Reviews" />} />
          <Route
            path="analytics/reviews"
            element={<PlaceholderPage title="Review Analytics" />}
          />
          <Route
            path="analytics/competitors"
            element={<PlaceholderPage title="Competitor Analytics" />}
          />
          <Route
            path="social-listening"
            element={<PlaceholderPage title="Social Listening" />}
          />
          <Route path="surveys" element={<SurveysPage />} />
          <Route path="settings" element={<LocationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
