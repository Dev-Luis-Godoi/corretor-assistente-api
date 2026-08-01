import { z } from "zod";

const optionalText = (maxLength: number) => z.string().trim().min(1).max(maxLength).optional();

export const createLeadSchema = z.object({
  title: z.string().trim().min(2).max(160),
  contactId: z.uuid(),
  stageId: z.uuid(),
  assignedUserId: z.uuid().optional(),
  source: optionalText(80),
  notes: optionalText(5_000),
  estimatedValue: z.number().nonnegative().max(9_999_999_999.99).optional(),
});

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  stageId: z.uuid().optional(),
  assignedUserId: z.uuid().optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const leadParamsSchema = z.object({
  id: z.uuid(),
});

export const updateLeadStageSchema = z.object({
  stageId: z.uuid(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type UpdateLeadStageInput = z.infer<typeof updateLeadStageSchema>;
