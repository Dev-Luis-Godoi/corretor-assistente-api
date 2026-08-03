import type { FastifyReply, FastifyRequest } from "fastify";

import {
  conversationLeadParamsSchema,
  createLeadActivitySchema,
  createLeadFromConversationSchema,
  createLeadSchema,
  leadParamsSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
  updateLeadStageSchema,
} from "./schemas.js";
import type { LeadService } from "./service.js";

export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const lead = await this.leadService.create(request.user.organizationId, createLeadSchema.parse(request.body), request.user.sub);
    return reply.status(201).send({ lead });
  }
  async createFromConversation(request: FastifyRequest, reply: FastifyReply) {
    const { conversationId } = conversationLeadParamsSchema.parse(request.params);
    const lead = await this.leadService.createFromConversation(request.user.organizationId, conversationId, createLeadFromConversationSchema.parse(request.body), request.user.sub);
    return reply.status(201).send({ lead });
  }
  async list(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await this.leadService.list(request.user.organizationId, listLeadsQuerySchema.parse(request.query)));
  }
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = leadParamsSchema.parse(request.params);
    return reply.send({ lead: await this.leadService.getById(request.user.organizationId, id) });
  }
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = leadParamsSchema.parse(request.params);
    return reply.send({ lead: await this.leadService.update(request.user.organizationId, id, updateLeadSchema.parse(request.body)) });
  }
  async updateStage(request: FastifyRequest, reply: FastifyReply) {
    const { id } = leadParamsSchema.parse(request.params);
    const lead = await this.leadService.updateStage(request.user.organizationId, id, updateLeadStageSchema.parse(request.body), request.user.sub);
    return reply.send({ lead });
  }
  async addActivity(request: FastifyRequest, reply: FastifyReply) {
    const { id } = leadParamsSchema.parse(request.params);
    const activity = await this.leadService.addActivity(request.user.organizationId, id, createLeadActivitySchema.parse(request.body), request.user.sub);
    return reply.status(201).send({ activity });
  }
}
