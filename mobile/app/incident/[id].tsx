import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import type { Incident } from "@feedback-platform/shared";
import {
  fetchIncident,
  formatIncidentDate,
  channelLabelEn,
  issueCategoryLabelEn,
  statusLabel,
  updateIncident,
} from "../../src/api/incidents";
import { useTenant } from "../../src/context/TenantContext";

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { slug, getToken } = useTenant();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug || !id) {
      return;
    }

    setError(null);
    try {
      const match = await fetchIncident(slug, id, getToken);
      setIncident(match);
    } catch (err) {
      setIncident(null);
      setError(err instanceof Error ? err.message : "Failed to load incident");
    } finally {
      setLoading(false);
    }
  }, [slug, id, getToken]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  async function setStatus(status: "reviewed" | "resolved") {
    if (!slug || !incident) {
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      const updated = await updateIncident(slug, incident.id, getToken, {
        status,
      });
      setIncident(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update incident");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? "Incident not found"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.code}>{incident.code}</Text>
      <Text style={styles.status}>{statusLabel(incident.status)}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Survey</Text>
        <Text style={styles.value}>{incident.surveyName}</Text>
      </View>

      {incident.locationName ? (
        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{incident.locationName}</Text>
        </View>
      ) : null}

      {incident.rating != null ? (
        <View style={styles.section}>
          <Text style={styles.label}>Rating</Text>
          <Text style={styles.value}>{incident.rating} / 5</Text>
        </View>
      ) : null}

      {incident.channel ? (
        <View style={styles.section}>
          <Text style={styles.label}>Channel</Text>
          <Text style={styles.value}>{channelLabelEn(incident.channel)}</Text>
        </View>
      ) : null}

      {incident.issueCategory ? (
        <View style={styles.section}>
          <Text style={styles.label}>Issue</Text>
          <Text style={styles.value}>
            {issueCategoryLabelEn(incident.issueCategory)}
          </Text>
        </View>
      ) : null}

      {incident.customerEmail ? (
        <View style={styles.section}>
          <Text style={styles.label}>Customer</Text>
          <Text style={styles.value}>{incident.customerEmail}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>Timeline</Text>
        {incident.timeline.map((event, index) => (
          <Text key={`${event.status}-${index}`} style={styles.value}>
            {statusLabel(event.status)} · {formatIncidentDate(event.at)}
          </Text>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {incident.status === "created" ? (
        <Pressable
          style={styles.button}
          disabled={updating}
          onPress={() => void setStatus("reviewed")}
        >
          <Text style={styles.buttonText}>Mark reviewed</Text>
        </Pressable>
      ) : null}

      {incident.status !== "resolved" ? (
        <Pressable
          style={[styles.button, styles.secondaryButton]}
          disabled={updating}
          onPress={() => void setStatus("resolved")}
        >
          <Text style={styles.buttonText}>Mark resolved</Text>
        </Pressable>
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
    padding: 16,
  },
  code: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  status: {
    color: "#7c3aed",
    fontWeight: "600",
    marginBottom: 8,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
  },
  label: {
    color: "#6b7280",
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    color: "#111827",
    fontSize: 15,
  },
  button: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: "#059669",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  error: {
    color: "#dc2626",
  },
});
