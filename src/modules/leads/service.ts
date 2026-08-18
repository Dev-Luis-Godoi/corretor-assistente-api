import type { PrismaClient } from "@/generated/prisma/client.js";
import {
  AutomationAction,
  AutomationTrigger,
  LeadActivityType,
  Prisma,
  TaskPriority,
} from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";

import type {
  CreateLeadActivityInput,
  CreateLeadFromConversationInput,
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
  UpdateLeadStageInput,
} from "./schemas.js";

const leadSelect = {
  id: true,
  title: true,
  source: true,
  notes: true,
  interest: true,
  tags: true,
  estimatedValue: true,
  closedAt: true,
  lostReason: true,
  nextFollowUpAt: true,
  expectedCloseAt: true,
  lastInteractionAt: true,
  organizationId: true,
  contact: { select: { id: true, name: true, phone: true, email: true } },
  stage: {
    select: { id: true, name: true, position: true, color: true, isWon: true, isLost: true },
  },
  assignedUser: { select: { id: true, name: true } },
  conversations: { select: { id: true }, take: 1 },
  _count: { select: { activities: true, tasks: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LeadSelect;

const leadDetailSelect = {
  ...leadSelect,
  activities: {
    select: {
      id: true,
      type: true,
      description: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" as const },
    take: 50,
  },
  tasks: {
    select: {
      id: true,
      title: true,
      description: true,
      dueAt: true,
      status: true,
      priority: true,
      completedAt: true,
    },
    orderBy: { dueAt: "asc" as const },
    take: 50,
  },
  stageHistory: {
    select: {
      id: true,
      fromStageId: true,
      changedAt: true,
      toStage: { select: { id: true, name: true, color: true } },
    },
    orderBy: { changedAt: "desc" as const },
    take: 50,
  },
} satisfies Prisma.LeadSelect;

type LeadView = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;
type LeadDetailView = Prisma.LeadGetPayload<{ select: typeof leadDetailSelect }>;

interface LeadList {
  data: LeadView[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export class LeadService {
  constructor(private readonly database: PrismaClient) {}

  async create(organizationId: string, input: CreateLeadInput, userId?: string): Promise<LeadView> {
    await this.validateRelations(
      organizationId,
      input.contactId,
      input.stageId,
      input.assignedUserId,
    );
    const existing = await this.database.lead.findFirst({
      where: { organizationId, contactId: input.contactId, stage: { isWon: false, isLost: false } },
      select: { id: true },
    });
    if (existing)
      throw new AppError(
        "An active lead already exists for this contact",
        409,
        "LEAD_ALREADY_EXISTS",
      );

    const lead = await this.database.$transaction(async (transaction) => {
      const created = await transaction.lead.create({
        data: { ...input, organizationId },
        select: leadSelect,
      });
      await transaction.leadActivity.create({
        data: {
          organizationId,
          leadId: created.id,
          createdById: userId,
          type: LeadActivityType.CREATED,
          description: "Lead criado",
        },
      });
      await transaction.leadStageHistory.create({
        data: { organizationId, leadId: created.id, toStageId: input.stageId, changedById: userId },
      });
      return created;
    });
    await this.runAutomations(organizationId, lead.id, AutomationTrigger.LEAD_CREATED);
    return this.getById(organizationId, lead.id);
  }

  async createFromConversation(
    organizationId: string,
    conversationId: string,
    input: CreateLeadFromConversationInput,
    userId?: string,
  ): Promise<LeadView> {
    const conversation = await this.database.conversation.findFirst({
      where: { id: conversationId, organizationId },
      select: {
        id: true,
        leadId: true,
        contactId: true,
        contact: { select: { name: true, phone: true } },
      },
    });
    if (!conversation) throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
    if (conversation.leadId)
      throw new AppError(
        "This conversation is already linked to a lead",
        409,
        "CONVERSATION_ALREADY_HAS_LEAD",
      );
    const existing = await this.database.lead.findFirst({
      where: {
        organizationId,
        contactId: conversation.contactId,
        stage: { isWon: false, isLost: false },
      },
      select: { id: true },
    });
    if (existing) {
      await this.database.conversation.update({
        where: { id: conversation.id },
        data: { leadId: existing.id },
      });
      throw new AppError(
        "An active lead already exists and was linked to this conversation",
        409,
        "LEAD_ALREADY_EXISTS",
      );
    }
    const stage = await this.database.pipelineStage.findFirst({
      where: { organizationId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    if (!stage) throw new AppError("Pipeline stage not found", 404, "PIPELINE_STAGE_NOT_FOUND");
    if (input.assignedUserId) await this.validateAssignedUser(organizationId, input.assignedUserId);

    const lead = await this.database.$transaction(async (transaction) => {
      const created = await transaction.lead.create({
        data: {
          organizationId,
          contactId: conversation.contactId,
          stageId: stage.id,
          title: input.title ?? conversation.contact.name ?? conversation.contact.phone,
          source: input.source,
          notes: input.notes,
          interest: input.interest,
          tags: input.tags,
          estimatedValue: input.estimatedValue,
          nextFollowUpAt: input.nextFollowUpAt,
          assignedUserId: input.assignedUserId,
          lastInteractionAt: new Date(),
        },
        select: leadSelect,
      });
      await transaction.conversation.update({
        where: { id: conversation.id },
        data: { leadId: created.id },
      });
      await transaction.leadActivity.create({
        data: {
          organizationId,
          leadId: created.id,
          createdById: userId,
          type: LeadActivityType.CREATED,
          description: "Lead criado a partir de uma conversa do WhatsApp",
        },
      });
      await transaction.leadStageHistory.create({
        data: { organizationId, leadId: created.id, toStageId: stage.id, changedById: userId },
      });
      return created;
    });
    await this.runAutomations(organizationId, lead.id, AutomationTrigger.LEAD_CREATED);
    return this.getById(organizationId, lead.id);
  }

  async list(organizationId: string, query: ListLeadsQuery): Promise<LeadList> {
    const where = {
      organizationId,
      client: null,
      stageId: query.stageId,
      assignedUserId: query.assignedUserId,
      source: query.source
        ? { equals: query.source, mode: Prisma.QueryMode.insensitive }
        : undefined,
      tags: query.tag ? { has: query.tag } : undefined,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            {
              contact: {
                is: { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
              },
            },
            { contact: { is: { phone: { contains: query.search } } } },
          ]
        : undefined,
    } satisfies Prisma.LeadWhereInput;
    const [leads, total] = await this.database.$transaction([
      this.database.lead.findMany({
        where,
        select: leadSelect,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.lead.count({ where }),
    ]);
    return {
      data: leads,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getById(organizationId: string, leadId: string): Promise<LeadDetailView> {
    const lead = await this.database.lead.findFirst({
      where: { id: leadId, organizationId },
      select: leadDetailSelect,
    });
    if (!lead) throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
    return lead;
  }

  async update(organizationId: string, leadId: string, input: UpdateLeadInput): Promise<LeadView> {
    const lead = await this.database.lead.findFirst({
      where: { id: leadId, organizationId },
      select: { id: true },
    });
    if (!lead) throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
    if (input.assignedUserId) await this.validateAssignedUser(organizationId, input.assignedUserId);
    return this.database.lead.update({ where: { id: lead.id }, data: input, select: leadSelect });
  }

  async updateStage(
    organizationId: string,
    leadId: string,
    input: UpdateLeadStageInput,
    userId?: string,
  ): Promise<LeadView> {
    const [lead, stage] = await Promise.all([
      this.database.lead.findFirst({
        where: { id: leadId, organizationId },
        select: {
          id: true,
          stageId: true,
          title: true,
          notes: true,
          contact: { select: { name: true, phone: true, email: true } },
        },
      }),
      this.database.pipelineStage.findFirst({
        where: { id: input.stageId, organizationId },
        select: { id: true, name: true, isWon: true, isLost: true },
      }),
    ]);
    if (!lead) throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
    if (!stage) throw new AppError("Pipeline stage not found", 404, "PIPELINE_STAGE_NOT_FOUND");
    if (stage.isLost && !input.lostReason)
      throw new AppError("A loss reason is required", 400, "LOST_REASON_REQUIRED");
    if (lead.stageId === stage.id)
      return this.database.lead.findUniqueOrThrow({ where: { id: lead.id }, select: leadSelect });
    const updated = await this.database.$transaction(async (transaction) => {
      const result = await transaction.lead.update({
        where: { id: lead.id },
        data: {
          stageId: stage.id,
          lostReason: stage.isLost ? input.lostReason : null,
          closedAt: stage.isWon || stage.isLost ? new Date() : null,
        },
        select: leadSelect,
      });
      await transaction.leadStageHistory.create({
        data: {
          organizationId,
          leadId: lead.id,
          fromStageId: lead.stageId,
          toStageId: stage.id,
          changedById: userId,
        },
      });
      await transaction.leadActivity.create({
        data: {
          organizationId,
          leadId: lead.id,
          createdById: userId,
          type: LeadActivityType.STAGE_CHANGED,
          description: `Lead movido para ${stage.name}`,
        },
      });
      const becomesClient =
        stage.isWon || stage.name.trim().toLocaleLowerCase("pt-BR") === "contrato assinado";
      if (becomesClient) {
        await transaction.client.upsert({
          where: { leadId: lead.id },
          create: {
            organizationId,
            leadId: lead.id,
            name: lead.contact.name ?? lead.title,
            phone: lead.contact.phone,
            email: lead.contact.email,
            notes: lead.notes,
            origin: "PIPELINE",
          },
          update: {
            name: lead.contact.name ?? lead.title,
            phone: lead.contact.phone,
            email: lead.contact.email,
            notes: lead.notes,
            origin: "PIPELINE",
          },
        });
      }
      return result;
    });
    await this.runAutomations(organizationId, lead.id, AutomationTrigger.STAGE_CHANGED, stage.id);
    return updated;
  }

  async addActivity(
    organizationId: string,
    leadId: string,
    input: CreateLeadActivityInput,
    userId: string,
  ) {
    const lead = await this.database.lead.findFirst({
      where: { id: leadId, organizationId },
      select: { id: true },
    });
    if (!lead) throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
    return this.database.$transaction(async (transaction) => {
      const activity = await transaction.leadActivity.create({
        data: {
          organizationId,
          leadId: lead.id,
          createdById: userId,
          type: input.type,
          description: input.description,
        },
        select: {
          id: true,
          type: true,
          description: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true } },
        },
      });
      await transaction.lead.update({
        where: { id: lead.id },
        data: { lastInteractionAt: new Date() },
      });
      return activity;
    });
  }

  private async validateRelations(
    organizationId: string,
    contactId: string,
    stageId: string,
    assignedUserId?: string,
  ) {
    const [contact, stage] = await Promise.all([
      this.database.contact.findFirst({
        where: { id: contactId, organizationId },
        select: { id: true },
      }),
      this.database.pipelineStage.findFirst({
        where: { id: stageId, organizationId },
        select: { id: true },
      }),
    ]);
    if (!contact) throw new AppError("Contact not found", 404, "CONTACT_NOT_FOUND");
    if (!stage) throw new AppError("Pipeline stage not found", 404, "PIPELINE_STAGE_NOT_FOUND");
    if (assignedUserId) await this.validateAssignedUser(organizationId, assignedUserId);
  }

  private async validateAssignedUser(organizationId: string, assignedUserId: string) {
    const user = await this.database.user.findFirst({
      where: { id: assignedUserId, organizationId },
      select: { id: true },
    });
    if (!user) throw new AppError("Assigned user not found", 404, "ASSIGNED_USER_NOT_FOUND");
  }

  private async runAutomations(
    organizationId: string,
    leadId: string,
    trigger: AutomationTrigger,
    stageId?: string,
  ) {
    const rules = await this.database.automationRule.findMany({
      where: { organizationId, trigger, enabled: true, OR: [{ stageId: null }, { stageId }] },
      orderBy: { createdAt: "asc" },
    });
    for (const rule of rules) {
      if (rule.action === AutomationAction.CREATE_TASK) {
        const lead = await this.database.lead.findUnique({
          where: { id: leadId },
          select: { title: true, assignedUserId: true },
        });
        if (lead)
          await this.database.task.create({
            data: {
              organizationId,
              leadId,
              assignedUserId: lead.assignedUserId,
              title: `Follow-up: ${lead.title}`,
              dueAt: new Date(Date.now() + rule.delayMinutes * 60_000),
              priority: TaskPriority.MEDIUM,
            },
          });
      }
      if (rule.action === AutomationAction.ASSIGN_LEAD) {
        const user = await this.database.user.findFirst({
          where: { organizationId },
          orderBy: { assignedLeads: { _count: "asc" } },
          select: { id: true },
        });
        if (user)
          await this.database.lead.update({
            where: { id: leadId },
            data: { assignedUserId: user.id },
          });
      }
    }
  }
}
