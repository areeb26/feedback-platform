import { useEffect, useState } from "react";

type HealthState = "loading" | "ok" | "error";

export function App() {
  const [health, setHealth] = useState<HealthState>("loading");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setHealth(data.status === "ok" ? "ok" : "error"))
      .catch(() => setHealth("error"));
  }, []);

  if (health === "loading") {
    return <div>Loading...</div>;
  }

  return <div>API: {health}</div>;
}
