import type { PrismaClient } from "@/generated/prisma/client.js";
import { Prisma } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";

import type { CreateLeadInput, ListLeadsQuery, UpdateLeadStageInput } from "./schemas.js";

const leadSelect = {
  id: true,
  title: true,
  source: true,
  notes: true,
  estimatedValue: true,
  closedAt: true,
  lostReason: true,
  organizationId: true,
  contact: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  },
  stage: {
    select: {
      id: true,
      name: true,
      position: true,
      color: true,
      isWon: true,
      isLost: true,
    },
  },
  assignedUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LeadSelect;

type LeadView = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

interface LeadList {
  data: LeadView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class LeadService {
  constructor(private readonly database: PrismaClient) {}

  async create(organizationId: string, input: CreateLeadInput): Promise<LeadView> {
    const [contact, stage, assignedUser] = await Promise.all([
      this.database.contact.findFirst({
        where: { id: input.contactId, organizationId },
        select: { id: true },
      }),
      this.database.pipelineStage.findFirst({
        where: { id: input.stageId, organizationId },
        select: { id: true },
      }),
      input.assignedUserId
        ? this.database.user.findFirst({
            where: { id: input.assignedUserId, organizationId },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!contact) {
      throw new AppError("Contact not found", 404, "CONTACT_NOT_FOUND");
    }

    if (!stage) {
      throw new AppError("Pipeline stage not found", 404, "PIPELINE_STAGE_NOT_FOUND");
    }

    if (input.assignedUserId && !assignedUser) {
      throw new AppError("Assigned user not found", 404, "ASSIGNED_USER_NOT_FOUND");
    }

    return this.database.lead.create({
      data: {
        title: input.title,
        source: input.source,
        notes: input.notes,
        estimatedValue: input.estimatedValue,
        organizationId,
        contactId: input.contactId,
        stageId: input.stageId,
        assignedUserId: input.assignedUserId,
      },
      select: leadSelect,
    });
  }

  async list(organizationId: string, query: ListLeadsQuery): Promise<LeadList> {
    const where = {
      organizationId,
      stageId: query.stageId,
      assignedUserId: query.assignedUserId,
      title: query.search
        ? {
            contains: query.search,
            mode: Prisma.QueryMode.insensitive,
          }
        : undefined,
    } satisfies Prisma.LeadWhereInput;

    const [leads, total] = await this.database.$transaction([
      this.database.lead.findMany({
        where,
        select: leadSelect,
        orderBy: { createdAt: "desc" },
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

  async updateStage(
    organizationId: string,
    leadId: string,
    input: UpdateLeadStageInput,
  ): Promise<LeadView> {
    const [lead, stage] = await Promise.all([
      this.database.lead.findFirst({
        where: { id: leadId, organizationId },
        select: { id: true },
      }),
      this.database.pipelineStage.findFirst({
        where: { id: input.stageId, organizationId },
        select: { id: true },
      }),
    ]);

    if (!lead) {
      throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
    }

    if (!stage) {
      throw new AppError("Pipeline stage not found", 404, "PIPELINE_STAGE_NOT_FOUND");
    }

    return this.database.lead.update({
      where: { id: lead.id },
      data: { stageId: stage.id },
      select: leadSelect,
    });
  }
}
