import { z } from "zod";

import { ConversationStatus } from "@/generated/prisma/enums.js";

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(ConversationStatus).optional(),
  whatsappAccountId: z.uuid().optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const conversationParamsSchema = z.object({
  id: z.uuid(),
});

export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
