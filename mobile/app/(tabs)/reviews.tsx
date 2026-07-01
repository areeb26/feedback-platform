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
import type { Review } from "@feedback-platform/shared";
import {
  fetchReviews,
  formatReviewDate,
  reviewStatusLabel,
} from "../../src/api/reviews";
import { useTenant } from "../../src/context/TenantContext";

export default function ReviewsScreen() {
  const router = useRouter();
  const { slug, getToken } = useTenant();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!slug) {
      return;
    }

    setError(null);
    try {
      const data = await fetchReviews(slug, getToken);
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
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

  if (loading && reviews.length === 0) {
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
        data={reviews}
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
        ListEmptyComponent={<Text style={styles.empty}>No reviews yet.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/review/${item.id}`)}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.name}>{item.reviewerName}</Text>
              <Text style={styles.rating}>{item.rating}★</Text>
            </View>
            <Text numberOfLines={2} style={styles.content}>
              {item.content}
            </Text>
            <Text style={styles.meta}>
              {reviewStatusLabel(item.status)} · {formatReviewDate(item.postedAt)}
            </Text>
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
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  rating: {
    color: "#7c3aed",
    fontWeight: "600",
  },
  content: {
    marginTop: 6,
    color: "#374151",
  },
  meta: {
    marginTop: 6,
    color: "#6b7280",
    fontSize: 13,
  },
});
