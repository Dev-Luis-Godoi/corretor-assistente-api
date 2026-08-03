import { z } from "zod";

import { LeadActivityType } from "@/generated/prisma/enums.js";

const optionalText = (maxLength: number) => z.string().trim().min(1).max(maxLength).optional();
const optionalDate = z.iso.datetime().transform((value) => new Date(value)).optional().nullable();
const tagsSchema = z.array(z.string().trim().min(1).max(30)).max(12).transform((tags) => [...new Set(tags)]);

export const createLeadSchema = z.object({
  title: z.string().trim().min(2).max(160),
  contactId: z.uuid(),
  stageId: z.uuid(),
  assignedUserId: z.uuid().optional(),
  source: optionalText(80),
  notes: optionalText(5_000),
  interest: optionalText(160),
  tags: tagsSchema.optional(),
  estimatedValue: z.number().nonnegative().max(9_999_999_999.99).optional(),
  nextFollowUpAt: optionalDate,
  expectedCloseAt: optionalDate,
}).strict();

export const createLeadFromConversationSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  assignedUserId: z.uuid().optional(),
  source: z.string().trim().min(1).max(80).default("WhatsApp"),
  notes: optionalText(5_000),
  interest: optionalText(160),
  tags: tagsSchema.optional(),
  estimatedValue: z.number().nonnegative().max(9_999_999_999.99).optional(),
  nextFollowUpAt: optionalDate,
}).strict();

export const updateLeadSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  assignedUserId: z.uuid().nullable().optional(),
  source: z.string().trim().min(1).max(80).nullable().optional(),
  notes: z.string().trim().max(5_000).nullable().optional(),
  interest: z.string().trim().max(160).nullable().optional(),
  tags: tagsSchema.optional(),
  estimatedValue: z.number().nonnegative().max(9_999_999_999.99).nullable().optional(),
  nextFollowUpAt: optionalDate,
  expectedCloseAt: optionalDate,
}).strict().refine((input) => Object.values(input).some((value) => value !== undefined), {
  message: "At least one field must be provided",
});

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  stageId: z.uuid().optional(),
  assignedUserId: z.uuid().optional(),
  source: z.string().trim().min(1).max(80).optional(),
  tag: z.string().trim().min(1).max(30).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const leadParamsSchema = z.object({ id: z.uuid() }).strict();
export const conversationLeadParamsSchema = z.object({ conversationId: z.uuid() }).strict();

export const updateLeadStageSchema = z.object({
  stageId: z.uuid(),
  lostReason: z.string().trim().min(2).max(500).optional(),
}).strict();

export const createLeadActivitySchema = z.object({
  type: z.enum(LeadActivityType).exclude(["CREATED", "STAGE_CHANGED"]),
  description: z.string().trim().min(1).max(2_000),
}).strict();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type CreateLeadFromConversationInput = z.infer<typeof createLeadFromConversationSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type UpdateLeadStageInput = z.infer<typeof updateLeadStageSchema>;
export type CreateLeadActivityInput = z.infer<typeof createLeadActivitySchema>;
