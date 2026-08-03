import type { PrismaClient } from "@/generated/prisma/client.js";

export class DashboardService {
  constructor(private readonly database: PrismaClient) {}

  async summary(organizationId: string) {
    const [newLeads, awaitingResponse, visitStage, wonStage, stages, recentConversations] =
      await Promise.all([
        this.database.lead.count({
          where: { organizationId, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
        }),
        this.database.conversation.count({ where: { organizationId, status: "OPEN", unreadCount: { gt: 0 } } }),
        this.database.pipelineStage.findFirst({ where: { organizationId, name: { contains: "Visita", mode: "insensitive" } }, select: { id: true } }),
        this.database.pipelineStage.findFirst({ where: { organizationId, isWon: true }, select: { id: true } }),
        this.database.pipelineStage.findMany({ where: { organizationId }, orderBy: { position: "asc" }, select: { id: true, name: true, color: true, position: true, isWon: true, isLost: true, _count: { select: { leads: true } } } }),
        this.database.conversation.findMany({ where: { organizationId }, orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }], take: 4, select: { id: true, status: true, unreadCount: true, lastMessageAt: true, contact: { select: { name: true, phone: true, avatarUrl: true } }, messages: { orderBy: { sentAt: "desc" }, take: 1, select: { content: true, type: true, sentAt: true } } } }),
      ]);

    const [visits, closed] = await Promise.all([
      visitStage ? this.database.lead.count({ where: { organizationId, stageId: visitStage.id } }) : 0,
      wonStage ? this.database.lead.aggregate({ where: { organizationId, stageId: wonStage.id }, _count: true, _sum: { estimatedValue: true } }) : null,
    ]);

    return {
      stats: { newLeads, awaitingResponse, visits, closed: closed?._count ?? 0, closedValue: closed?._sum.estimatedValue ?? 0 },
      pipeline: stages.map(({ _count, ...stage }) => ({ ...stage, leads: _count.leads })),
      recentConversations,
    };
  }
}
