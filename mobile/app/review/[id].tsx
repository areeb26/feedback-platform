import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import type { Review } from "@feedback-platform/shared";
import {
  fetchReview,
  formatReviewDate,
  replyToReview,
  reviewStatusLabel,
} from "../../src/api/reviews";
import { useTenant } from "../../src/context/TenantContext";

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { slug, getToken } = useTenant();
  const [review, setReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug || !id) {
      return;
    }

    setError(null);
    try {
      const match = await fetchReview(slug, id, getToken);
      setReview(match);
    } catch (err) {
      setReview(null);
      setError(err instanceof Error ? err.message : "Failed to load review");
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

  async function submitReply() {
    if (!slug || !review || !replyText.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const updated = await replyToReview(slug, review.id, getToken, {
        replyText: replyText.trim(),
      });
      setReview(updated);
      setReplyText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!review) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? "Review not found"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{review.reviewerName}</Text>
      <Text style={styles.meta}>
        {review.rating}★ · {reviewStatusLabel(review.status)} ·{" "}
        {formatReviewDate(review.postedAt)}
      </Text>

      <View style={styles.section}>
        <Text style={styles.content}>{review.content}</Text>
      </View>

      {review.replyText ? (
        <View style={styles.section}>
          <Text style={styles.label}>Your reply</Text>
          <Text style={styles.content}>{review.replyText}</Text>
        </View>
      ) : null}

      {review.canReply ? (
        <>
          <TextInput
            multiline
            placeholder="Write a reply..."
            style={styles.input}
            value={replyText}
            onChangeText={setReplyText}
          />
          <Pressable
            style={[styles.button, submitting && styles.buttonDisabled]}
            disabled={submitting || !replyText.trim()}
            onPress={() => void submitReply()}
          >
            <Text style={styles.buttonText}>
              {submitting ? "Sending..." : "Send reply"}
            </Text>
          </Pressable>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  meta: {
    color: "#6b7280",
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
    marginBottom: 6,
  },
  content: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    minHeight: 100,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 15,
  },
  button: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
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
