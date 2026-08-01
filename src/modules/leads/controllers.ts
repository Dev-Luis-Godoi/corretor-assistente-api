import type { FastifyReply, FastifyRequest } from "fastify";

import {
  createLeadSchema,
  leadParamsSchema,
  listLeadsQuerySchema,
  updateLeadStageSchema,
} from "./schemas.js";
import type { LeadService } from "./service.js";

export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = createLeadSchema.parse(request.body);
    const lead = await this.leadService.create(request.user.organizationId, input);

    return reply.status(201).send({ lead });
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listLeadsQuerySchema.parse(request.query);
    const result = await this.leadService.list(request.user.organizationId, query);

    return reply.send(result);
  }

  async updateStage(request: FastifyRequest, reply: FastifyReply) {
    const { id } = leadParamsSchema.parse(request.params);
    const input = updateLeadStageSchema.parse(request.body);
    const lead = await this.leadService.updateStage(request.user.organizationId, id, input);

    return reply.send({ lead });
  }
}
