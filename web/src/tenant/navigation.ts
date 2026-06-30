export const SUPPORT_WHATSAPP_URL =
  "https://wa.me/923219847726?text=Hey!%20Reaching%20out%20to%20you%20via%20%E2%80%9Ctext%20a%20founder%E2%80%9D%20feature.%20";

export type NavItem = {
  label: string;
  path: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export function tenantNavSections(slug: string): NavSection[] {
  const base = `/t/${slug}`;
  return [
    {
      title: "Feedback",
      items: [
        { label: "Overview", path: `${base}/overview` },
        { label: "Customers", path: `${base}/customers` },
        { label: "Incidents", path: `${base}/incidents` },
        { label: "Incident Analytics", path: `${base}/analytics/incidents` },
      ],
    },
    {
      title: "Reputation",
      items: [
        { label: "Listings", path: `${base}/listings` },
        { label: "Reviews", path: `${base}/reviews` },
        { label: "Review Analytics", path: `${base}/analytics/reviews` },
        { label: "Competitor Analytics", path: `${base}/analytics/competitors` },
        { label: "Social Listening", path: `${base}/social-listening` },
      ],
    },
    {
      title: "Platform",
      items: [
        { label: "Surveys", path: `${base}/surveys` },
        { label: "Settings", path: `${base}/settings` },
      ],
    },
  ];
}
