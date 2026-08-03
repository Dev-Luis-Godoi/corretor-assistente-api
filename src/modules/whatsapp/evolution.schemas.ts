import { z } from "zod";

export const evolutionAccountParamsSchema = z.object({ accountId: z.uuid() }).strict();
export const createEvolutionAccountSchema = z
  .object({ name: z.string().trim().min(2).max(80) })
  .strict();
export const evolutionWebhookSchema = z.object({ event: z.string().max(80), instance: z.string().min(1).max(120), data: z.unknown() }).passthrough();
export const evolutionMessageDataSchema = z.object({ key: z.object({ id: z.string().min(1).max(255), remoteJid: z.string().min(1).max(255), fromMe: z.boolean() }), pushName: z.string().max(160).optional(), messageType: z.string().max(80).optional(), messageTimestamp: z.union([z.string(), z.number()]).optional(), message: z.object({ conversation: z.string().max(10_000).optional(), extendedTextMessage: z.object({ text: z.string().max(10_000).optional() }).optional(), imageMessage: z.object({ caption: z.string().max(10_000).optional(), url: z.string().url().optional() }).optional(), audioMessage: z.object({ url: z.string().url().optional() }).optional(), videoMessage: z.object({ caption: z.string().max(10_000).optional(), url: z.string().url().optional() }).optional(), documentMessage: z.object({ caption: z.string().max(10_000).optional(), url: z.string().url().optional() }).optional() }).passthrough() }).passthrough();

export type CreateEvolutionAccountInput = z.infer<typeof createEvolutionAccountSchema>;
