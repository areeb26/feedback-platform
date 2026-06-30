import { useOutletContext } from "react-router-dom";
import type { TenantShell } from "@feedback-platform/shared";

type TenantOutletContext = {
  shell: TenantShell;
};

export function OverviewPage() {
  const { shell } = useOutletContext<TenantOutletContext>();

  return (
    <div>
      <h1>Overview</h1>
      <p>Welcome to {shell.name}</p>
    </div>
  );
}
