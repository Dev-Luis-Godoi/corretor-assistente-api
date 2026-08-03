import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createEvolutionAccountSchema,
  evolutionAccountParamsSchema,
} from "./evolution.schemas.js";
import type { EvolutionAccountService } from "./evolution-account.service.js";

export class EvolutionAccountController {
  constructor(private readonly service: EvolutionAccountService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const accounts = await this.service.list(request.user.organizationId);
    return reply.send({ accounts });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = createEvolutionAccountSchema.parse(request.body);
    const result = await this.service.create(request.user.organizationId, input);
    return reply.status(201).send(result);
  }

  async connect(request: FastifyRequest, reply: FastifyReply) {
    const { accountId } = evolutionAccountParamsSchema.parse(request.params);
    const result = await this.service.connect(request.user.organizationId, accountId);
    return reply.send(result);
  }

  async status(request: FastifyRequest, reply: FastifyReply) {
    const { accountId } = evolutionAccountParamsSchema.parse(request.params);
    const result = await this.service.getStatus(request.user.organizationId, accountId);
    return reply.send(result);
  }

  async configureWebhook(request: FastifyRequest, reply: FastifyReply) {
    const { accountId } = evolutionAccountParamsSchema.parse(request.params);
    await this.service.configureWebhook(request.user.organizationId, accountId);
    return reply.status(204).send();
  }
}
