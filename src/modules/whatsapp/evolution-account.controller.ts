import type { FastifyReply, FastifyRequest } from "fastify";
import { evolutionAccountParamsSchema } from "./evolution.schemas.js";
import type { EvolutionAccountService } from "./evolution-account.service.js";

export class EvolutionAccountController {
  constructor(private readonly service: EvolutionAccountService) {}
  async configureWebhook(request: FastifyRequest, reply: FastifyReply) {
    const { accountId } = evolutionAccountParamsSchema.parse(request.params);
    await this.service.configureWebhook(request.user.organizationId, accountId);
    return reply.status(204).send();
  }
}
