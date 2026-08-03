import { z } from "zod";

import { MessageDirection, MessageType } from "@/generated/prisma/enums.js";

export const listMessagesParamsSchema = z.object({
  conversationId: z.uuid(),
});

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  direction: z.enum(MessageDirection).optional(),
  type: z.enum(MessageType).optional(),
});
export const sendTextMessageSchema = z.object({ content: z.string().trim().min(1).max(4_096) }).strict();

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type SendTextMessageInput = z.infer<typeof sendTextMessageSchema>;
