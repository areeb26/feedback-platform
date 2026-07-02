import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { Incident } from "@feedback-platform/shared";
import {
  fetchIncidents,
  formatIncidentDate,
  statusLabel,
} from "../../src/api/incidents";
import { incidentContextLabel } from "../../src/lib/labels";
import { useTenant } from "../../src/context/TenantContext";

export default function IncidentsScreen() {
  const router = useRouter();
  const { slug, getToken } = useTenant();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!slug) {
      return;
    }

    setError(null);
    try {
      const data = await fetchIncidents(slug, getToken);
      setIncidents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load incidents");
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

  if (loading && incidents.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={incidents}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No incidents yet.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/incident/${item.id}`)}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.code}>{item.code}</Text>
              <Text style={styles.status}>{statusLabel(item.status)}</Text>
            </View>
            <Text style={styles.meta}>
              {item.surveyName}
              {item.rating != null ? ` · ${item.rating}★` : ""}
            </Text>
            {incidentContextLabel(item) ? (
              <Text style={styles.context}>{incidentContextLabel(item)}</Text>
            ) : null}
            <Text style={styles.date}>{formatIncidentDate(item.createdAt)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    color: "#dc2626",
    padding: 16,
  },
  empty: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 40,
  },
  row: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    padding: 16,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  code: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  status: {
    fontSize: 13,
    color: "#7c3aed",
    fontWeight: "600",
  },
  meta: {
    marginTop: 4,
    color: "#374151",
  },
  context: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 13,
  },
  date: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 13,
  },
});
