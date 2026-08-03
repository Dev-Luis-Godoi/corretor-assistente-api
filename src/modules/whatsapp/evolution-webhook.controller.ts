import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "@/config/env.js";
import { AppError } from "@/shared/errors/app-error.js";
import { evolutionAccountParamsSchema, evolutionWebhookSchema } from "./evolution.schemas.js";
import type { EvolutionWebhookService } from "./evolution-webhook.service.js";

function secretsMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received); const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export class EvolutionWebhookController {
  constructor(private readonly service: EvolutionWebhookService) {}
  async receive(request: FastifyRequest, reply: FastifyReply) {
    if (!env.EVOLUTION_WEBHOOK_SECRET) throw new AppError("Webhook is not configured", 503, "EVOLUTION_WEBHOOK_NOT_CONFIGURED");
    const receivedSecret = request.headers["x-evolution-webhook-secret"];
    if (typeof receivedSecret !== "string" || !secretsMatch(receivedSecret, env.EVOLUTION_WEBHOOK_SECRET)) throw new AppError("Invalid webhook signature", 401, "INVALID_WEBHOOK_SIGNATURE");
    const { accountId } = evolutionAccountParamsSchema.parse(request.params);
    const payload = evolutionWebhookSchema.parse(request.body);
    await this.service.handle(accountId, payload.instance, payload.event, payload.data);
    return reply.status(204).send();
  }
}
