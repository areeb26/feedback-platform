import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import type { Overview } from "@feedback-platform/shared";
import {
  fetchOverview,
  formatTrend,
  monthRange,
} from "../../src/api/overview";
import { useTenant } from "../../src/context/TenantContext";

function KpiCard({
  title,
  value,
  trend,
}: {
  title: string;
  value: string;
  trend: number;
}) {
  const trendColor =
    trend > 0 ? "#16a34a" : trend < 0 ? "#dc2626" : "#6b7280";

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={[styles.cardTrend, { color: trendColor }]}>
        {formatTrend(trend)} vs previous period
      </Text>
    </View>
  );
}

export default function OverviewScreen() {
  const { slug, getToken, profile, error: tenantError } = useTenant();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!slug) {
      return;
    }

    setError(null);
    try {
      const data = await fetchOverview(slug, getToken, monthRange());
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug, getToken]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (tenantError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{tenantError}</Text>
      </View>
    );
  }

  if (loading && !overview) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
    >
      <Text style={styles.heading}>{profile?.name ?? "Overview"}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {overview ? (
        <>
          <View style={styles.smileCard}>
            <Text style={styles.cardLabel}>Smile Score</Text>
            <Text style={styles.smileScore}>{overview.smileScore.toFixed(1)}</Text>
            <Text style={styles.cardTrend}>
              Target {overview.targetSmileScore.toFixed(1)} ·{" "}
              {formatTrend(overview.smileScoreTrend)} trend
            </Text>
          </View>

          <View style={styles.grid}>
            <KpiCard
              title="Submissions"
              value={String(overview.submissions)}
              trend={overview.submissionsTrend}
            />
            <KpiCard
              title="Incidents"
              value={String(overview.totalIncidents)}
              trend={overview.totalIncidentsTrend}
            />
            <KpiCard
              title="Resolved"
              value={`${overview.resolvedPercent.toFixed(0)}%`}
              trend={overview.resolvedPercentTrend}
            />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  smileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
  },
  smileScore: {
    fontSize: 42,
    fontWeight: "700",
    color: "#7c3aed",
    marginTop: 4,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
  },
  cardLabel: {
    color: "#6b7280",
    fontSize: 14,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  cardTrend: {
    fontSize: 13,
    marginTop: 8,
    color: "#6b7280",
  },
  error: {
    color: "#dc2626",
    marginBottom: 8,
  },
});
