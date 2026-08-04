import { z } from "zod";
import { ConsentStatus } from "@/generated/prisma/enums.js";

export const updateRetentionSchema=z.object({dataRetentionDays:z.number().int().min(30).max(3650)}).strict();
export const contactPrivacyParamsSchema=z.object({contactId:z.uuid()}).strict();
export const updateConsentSchema=z.object({consentStatus:z.enum(ConsentStatus),consentSource:z.string().trim().min(2).max(120).nullable().optional()}).strict();
export const auditQuerySchema=z.object({limit:z.coerce.number().int().positive().max(100).default(50)});
