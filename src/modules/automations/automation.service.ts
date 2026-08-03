import type { PrismaClient } from "@/generated/prisma/client.js";
import { Prisma } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";
import type { CreateRuleInput, CreateTemplateInput, UpdateRuleInput, UpdateTemplateInput } from "./automation.schemas.js";

export class AutomationService {
  constructor(private readonly database: PrismaClient) {}
  listTemplates(organizationId: string) { return this.database.messageTemplate.findMany({ where: { organizationId }, orderBy: { name: "asc" } }); }
  async createTemplate(organizationId: string, input: CreateTemplateInput) { try { return await this.database.messageTemplate.create({ data: { ...input, organizationId } }); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError("A template with this name already exists", 409, "TEMPLATE_ALREADY_EXISTS"); throw error; } }
  async updateTemplate(organizationId: string, id: string, input: UpdateTemplateInput) { await this.ensureTemplate(organizationId, id); return this.database.messageTemplate.update({ where: { id }, data: input }); }
  async deleteTemplate(organizationId: string, id: string) { await this.ensureTemplate(organizationId, id); await this.database.messageTemplate.delete({ where: { id } }); }
  listRules(organizationId: string) { return this.database.automationRule.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } }); }
  async createRule(organizationId: string, input: CreateRuleInput) { await this.validateStage(organizationId, input.stageId); return this.database.automationRule.create({ data: { ...input, organizationId } }); }
  async updateRule(organizationId: string, id: string, input: UpdateRuleInput) { const rule = await this.database.automationRule.findFirst({ where: { id, organizationId }, select: { id: true } }); if (!rule) throw new AppError("Automation rule not found", 404, "AUTOMATION_RULE_NOT_FOUND"); await this.validateStage(organizationId, input.stageId); return this.database.automationRule.update({ where: { id }, data: input }); }
  async deleteRule(organizationId: string, id: string) { const deleted = await this.database.automationRule.deleteMany({ where: { id, organizationId } }); if (!deleted.count) throw new AppError("Automation rule not found", 404, "AUTOMATION_RULE_NOT_FOUND"); }
  private async ensureTemplate(organizationId: string, id: string) { const template = await this.database.messageTemplate.findFirst({ where: { id, organizationId }, select: { id: true } }); if (!template) throw new AppError("Template not found", 404, "TEMPLATE_NOT_FOUND"); }
  private async validateStage(organizationId: string, stageId?: string) { if (!stageId) return; const stage = await this.database.pipelineStage.findFirst({ where: { id: stageId, organizationId }, select: { id: true } }); if (!stage) throw new AppError("Pipeline stage not found", 404, "PIPELINE_STAGE_NOT_FOUND"); }
}
