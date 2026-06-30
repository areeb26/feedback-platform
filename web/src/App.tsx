import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { CreateTenantPage } from "./pages/admin/CreateTenantPage";
import { TenantsPage } from "./pages/admin/TenantsPage";
import { HomePage } from "./pages/HomePage";
import { TenantLayout } from "./layouts/TenantLayout";
import { IncidentsPage } from "./pages/tenant/IncidentsPage";
import { LocationsPage } from "./pages/tenant/LocationsPage";
import { OverviewPage } from "./pages/tenant/OverviewPage";
import { CustomersPage } from "./pages/tenant/CustomersPage";
import { IncidentAnalyticsPage } from "./pages/tenant/IncidentAnalyticsPage";
import { ReviewsPage } from "./pages/tenant/ReviewsPage";
import { ReviewAnalyticsPage } from "./pages/tenant/ReviewAnalyticsPage";
import { ListingsPage } from "./pages/tenant/ListingsPage";
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
          <Route path="customers" element={<CustomersPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route
            path="analytics/incidents"
            element={<IncidentAnalyticsPage />}
          />
          <Route path="listings" element={<ListingsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route
            path="analytics/reviews"
            element={<ReviewAnalyticsPage />}
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
