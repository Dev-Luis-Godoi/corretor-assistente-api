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
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/ogg", "audio/mp4", "application/pdf"] as const;
export const sendMediaMessageSchema = z.object({
  type: z.enum([MessageType.IMAGE, MessageType.AUDIO, MessageType.DOCUMENT]),
  mimeType: z.enum(allowedMimeTypes),
  fileName: z.string().trim().min(1).max(180).regex(/^[^\\/:*?"<>|]+$/),
  base64: z.string().min(4).max(7_000_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
  caption: z.string().trim().max(1_024).optional(),
}).strict().superRefine((input,context)=>{
  if(input.type===MessageType.IMAGE&&!input.mimeType.startsWith("image/"))context.addIssue({code:"custom",message:"Invalid image MIME type"});
  if(input.type===MessageType.AUDIO&&!input.mimeType.startsWith("audio/"))context.addIssue({code:"custom",message:"Invalid audio MIME type"});
  if(input.type===MessageType.DOCUMENT&&input.mimeType!=="application/pdf")context.addIssue({code:"custom",message:"Invalid document MIME type"});
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type SendTextMessageInput = z.infer<typeof sendTextMessageSchema>;
export type SendMediaMessageInput = z.infer<typeof sendMediaMessageSchema>;
