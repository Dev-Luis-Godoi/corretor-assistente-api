import type { FastifyInstance } from "fastify";
import { prisma } from "@/infra/database/prisma.js";
import { EvolutionWebhookController } from "./evolution-webhook.controller.js";
import { EvolutionWebhookService } from "./evolution-webhook.service.js";
import { createRateLimit } from "@/shared/http/rate-limit.js";

export function evolutionWebhookRoutes(app: FastifyInstance) {
  const controller = new EvolutionWebhookController(new EvolutionWebhookService(prisma));
  app.post("/:accountId", { bodyLimit: 256 * 1024, preHandler: createRateLimit(300, 60_000) }, controller.receive.bind(controller));
}
