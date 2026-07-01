export type ReviewReplyInput = {
  id: string;
  content: string;
  rating: number;
  reviewerName: string;
};

export type OpenAiClient = {
  generateReviewReplies(input: {
    reviews: ReviewReplyInput[];
  }): Promise<Array<{ reviewId: string; draftReply: string }>>;
};

export function createNoopOpenAiClient(): OpenAiClient {
  return {
    async generateReviewReplies() {
      throw new Error("OpenAI client not configured");
    },
  };
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
};

function buildPrompt(reviews: ReviewReplyInput[]) {
  const payload = reviews.map((review) => ({
    reviewId: review.id,
    reviewerName: review.reviewerName,
    rating: review.rating,
    content: review.content,
  }));

  return `You are a professional customer service assistant. Generate concise, friendly public replies for each review below. Match tone to rating (apologetic for low ratings, grateful for high ratings). Keep each reply under 280 characters. Return ONLY valid JSON: an array of objects with "reviewId" and "draftReply" keys, one per input review, in the same order.

Reviews:
${JSON.stringify(payload, null, 2)}`;
}

export function createOpenAiClient(apiKey: string): OpenAiClient {
  return {
    async generateReviewReplies(input) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'Respond with JSON: { "drafts": [{ "reviewId": "...", "draftReply": "..." }] }',
            },
            { role: "user", content: buildPrompt(input.reviews) },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(errorBody.error?.message ?? "OpenAI request failed");
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned empty response");
      }

      const parsed = JSON.parse(content) as {
        drafts?: Array<{ reviewId: string; draftReply: string }>;
      };
      if (!parsed.drafts || !Array.isArray(parsed.drafts)) {
        throw new Error("OpenAI response missing drafts");
      }

      return parsed.drafts;
    },
  };
}

export function resolveOpenAiClient(override?: OpenAiClient): OpenAiClient {
  if (override) {
    return override;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    return createOpenAiClient(apiKey);
  }
  return createNoopOpenAiClient();
}
