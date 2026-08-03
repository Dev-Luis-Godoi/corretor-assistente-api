import { z } from "zod";
import { AutomationAction, AutomationTrigger, TemplateChannel } from "@/generated/prisma/enums.js";

export const createTemplateSchema = z.object({ name: z.string().trim().min(2).max(80), channel: z.enum(TemplateChannel).default("WHATSAPP"), content: z.string().trim().min(1).max(4_096) }).strict();
export const updateTemplateSchema = createTemplateSchema.partial().refine((input) => Object.values(input).some((value) => value !== undefined), { message: "At least one field must be provided" });
export const createRuleSchema = z.object({ name: z.string().trim().min(2).max(100), trigger: z.enum(AutomationTrigger), action: z.enum(AutomationAction), stageId: z.uuid().optional(), delayMinutes: z.number().int().min(0).max(43_200).default(0), enabled: z.boolean().default(false) }).strict();
export const updateRuleSchema = createRuleSchema.partial().refine((input) => Object.values(input).some((value) => value !== undefined), { message: "At least one field must be provided" });
export const automationParamsSchema = z.object({ id: z.uuid() }).strict();
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
