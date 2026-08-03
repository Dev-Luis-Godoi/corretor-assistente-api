import type { FastifyReply, FastifyRequest } from "fastify";
import { automationParamsSchema, createRuleSchema, createTemplateSchema, updateRuleSchema, updateTemplateSchema } from "./automation.schemas.js";
import type { AutomationService } from "./automation.service.js";

export class AutomationController {
  constructor(private readonly service: AutomationService) {}
  async listTemplates(request: FastifyRequest, reply: FastifyReply) { return reply.send({ templates: await this.service.listTemplates(request.user.organizationId) }); }
  async createTemplate(request: FastifyRequest, reply: FastifyReply) { return reply.status(201).send({ template: await this.service.createTemplate(request.user.organizationId, createTemplateSchema.parse(request.body)) }); }
  async updateTemplate(request: FastifyRequest, reply: FastifyReply) { const { id } = automationParamsSchema.parse(request.params); return reply.send({ template: await this.service.updateTemplate(request.user.organizationId, id, updateTemplateSchema.parse(request.body)) }); }
  async deleteTemplate(request: FastifyRequest, reply: FastifyReply) { const { id } = automationParamsSchema.parse(request.params); await this.service.deleteTemplate(request.user.organizationId, id); return reply.status(204).send(); }
  async listRules(request: FastifyRequest, reply: FastifyReply) { return reply.send({ rules: await this.service.listRules(request.user.organizationId) }); }
  async createRule(request: FastifyRequest, reply: FastifyReply) { return reply.status(201).send({ rule: await this.service.createRule(request.user.organizationId, createRuleSchema.parse(request.body)) }); }
  async updateRule(request: FastifyRequest, reply: FastifyReply) { const { id } = automationParamsSchema.parse(request.params); return reply.send({ rule: await this.service.updateRule(request.user.organizationId, id, updateRuleSchema.parse(request.body)) }); }
  async deleteRule(request: FastifyRequest, reply: FastifyReply) { const { id } = automationParamsSchema.parse(request.params); await this.service.deleteRule(request.user.organizationId, id); return reply.status(204).send(); }
}
