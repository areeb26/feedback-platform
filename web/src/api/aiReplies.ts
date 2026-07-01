import {
  autoReplyRuleSchema,
  createAutoReplyRuleRequestSchema,
  generateRepliesRequestSchema,
  generateRepliesResponseSchema,
  updateAutoReplyRuleRequestSchema,
  type AutoReplyRule,
  type CreateAutoReplyRuleRequest,
  type GenerateRepliesRequest,
  type GenerateRepliesResponse,
  type UpdateAutoReplyRuleRequest,
} from "@feedback-platform/shared";

const ruleListSchema = autoReplyRuleSchema.array();

function tenantBase(slug: string) {
  return `/api/tenant/by-slug/${slug}`;
}

export async function generateReviewReplies(
  slug: string,
  input: GenerateRepliesRequest,
): Promise<GenerateRepliesResponse> {
  const body = generateRepliesRequestSchema.parse(input);
  const response = await fetch(`${tenantBase(slug)}/reviews/generate-replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error ?? "Failed to generate replies");
  }
  return generateRepliesResponseSchema.parse(await response.json());
}

export async function fetchAutoReplyRules(slug: string): Promise<AutoReplyRule[]> {
  const response = await fetch(`${tenantBase(slug)}/auto-reply-rules`);
  if (!response.ok) {
    throw new Error("Failed to load auto-reply rules");
  }
  return ruleListSchema.parse(await response.json());
}

export async function createAutoReplyRule(
  slug: string,
  input: CreateAutoReplyRuleRequest,
): Promise<AutoReplyRule> {
  const body = createAutoReplyRuleRequestSchema.parse(input);
  const response = await fetch(`${tenantBase(slug)}/auto-reply-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to create auto-reply rule");
  }
  return autoReplyRuleSchema.parse(await response.json());
}

export async function updateAutoReplyRule(
  slug: string,
  ruleId: string,
  input: UpdateAutoReplyRuleRequest,
): Promise<AutoReplyRule> {
  const body = updateAutoReplyRuleRequestSchema.parse(input);
  const response = await fetch(`${tenantBase(slug)}/auto-reply-rules/${ruleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to update auto-reply rule");
  }
  return autoReplyRuleSchema.parse(await response.json());
}

export async function deleteAutoReplyRule(
  slug: string,
  ruleId: string,
): Promise<void> {
  const response = await fetch(`${tenantBase(slug)}/auto-reply-rules/${ruleId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete auto-reply rule");
  }
}

export type { AutoReplyRule, GenerateRepliesResponse };
