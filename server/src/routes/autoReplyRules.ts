import type { Request, Response } from "express";
import {
  autoReplyRuleSchema,
  createAutoReplyRuleRequestSchema,
  updateAutoReplyRuleRequestSchema,
} from "@feedback-platform/shared";
import { AutoReplyRule } from "../models/autoReplyRule.js";

function requireAiReplies(req: Request, res: Response) {
  if (!req.tenant?.featureFlags.aiReplies) {
    res.status(403).json({ error: "AI replies not enabled" });
    return false;
  }
  return true;
}

function toRuleResponse(rule: {
  _id: { toString(): string };
  name?: string | null;
  maxRating: number;
  templateText: string;
  enabled: boolean;
}) {
  return autoReplyRuleSchema.parse({
    id: rule._id.toString(),
    name: rule.name ?? null,
    maxRating: rule.maxRating,
    templateText: rule.templateText,
    enabled: rule.enabled,
  });
}

export function createAutoReplyRuleRoutes() {
  return {
    async list(req: Request, res: Response) {
      if (!requireAiReplies(req, res)) return;
      const rules = await AutoReplyRule.find({ tenantId: req.tenant!.id }).sort({
        maxRating: 1,
      });
      res.json(rules.map(toRuleResponse));
    },

    async create(req: Request, res: Response) {
      if (!requireAiReplies(req, res)) return;
      const input = createAutoReplyRuleRequestSchema.parse(req.body);
      const rule = await AutoReplyRule.create({
        tenantId: req.tenant!.id,
        name: input.name,
        maxRating: input.maxRating,
        templateText: input.templateText,
        enabled: input.enabled ?? true,
      });
      res.status(201).json(toRuleResponse(rule));
    },

    async update(req: Request, res: Response) {
      if (!requireAiReplies(req, res)) return;
      const input = updateAutoReplyRuleRequestSchema.parse(req.body);
      const rule = await AutoReplyRule.findOne({
        _id: req.params.ruleId,
        tenantId: req.tenant!.id,
      });
      if (!rule) {
        res.status(404).json({ error: "Auto-reply rule not found" });
        return;
      }

      if (input.name !== undefined) rule.name = input.name ?? undefined;
      if (input.maxRating !== undefined) rule.maxRating = input.maxRating;
      if (input.templateText !== undefined) rule.templateText = input.templateText;
      if (input.enabled !== undefined) rule.enabled = input.enabled;

      await rule.save();
      res.json(toRuleResponse(rule));
    },

    async remove(req: Request, res: Response) {
      if (!requireAiReplies(req, res)) return;
      const rule = await AutoReplyRule.findOneAndDelete({
        _id: req.params.ruleId,
        tenantId: req.tenant!.id,
      });
      if (!rule) {
        res.status(404).json({ error: "Auto-reply rule not found" });
        return;
      }
      res.status(204).send();
    },
  };
}
