import type { PrismaClient } from "@/generated/prisma/client.js";
import { MessageDirection, Prisma } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";
import type { AuditService } from "@/shared/audit/audit.service.js";

import type { ListConversationsQuery, UpdateConversationStatusInput } from "./conversation.schemas.js";

const conversationSelect = {
  id: true,
  status: true,
  unreadCount: true,
  lastMessageAt: true,
  externalId: true,
  contact: {
    select: {
      id: true,
      name: true,
      phone: true,
      avatarUrl: true,
    },
  },
  whatsappAccount: {
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      isConnected: true,
    },
  },
  lead: {
    select: { id: true, title: true, assignedUser: { select: { id: true, name: true } }, stage: { select: { id: true, name: true, color: true } } },
  },
  messages: {
    select: {
      id: true,
      direction: true,
      type: true,
      content: true,
      mediaUrl: true,
      sentAt: true,
    },
    orderBy: { sentAt: "desc" },
    take: 1,
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ConversationSelect;

type ConversationView = Prisma.ConversationGetPayload<{ select: typeof conversationSelect }>;

interface ConversationList {
  data: ConversationView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ConversationService {
  constructor(private readonly database: PrismaClient, private readonly audit?: AuditService) {}

  async list(organizationId: string, query: ListConversationsQuery): Promise<ConversationList> {
    const where = {
      organizationId,
      status: query.status,
      whatsappAccountId: query.whatsappAccountId,
      lead: query.assignedUserId ? { is: { assignedUserId: query.assignedUserId } } : undefined,
      contact: query.search
        ? {
            is: {
              OR: [
                { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                { phone: { contains: query.search } },
              ],
            },
          }
        : undefined,
    } satisfies Prisma.ConversationWhereInput;

    const [conversations, total] = await this.database.$transaction([
      this.database.conversation.findMany({
        where,
        select: conversationSelect,
        orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.conversation.count({ where }),
    ]);

    return {
      data: conversations,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getById(organizationId: string, conversationId: string): Promise<ConversationView> {
    const conversation = await this.database.conversation.findFirst({
      where: { id: conversationId, organizationId },
      select: conversationSelect,
    });

    if (!conversation) {
      throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
    }

    return conversation;
  }

  async markAsRead(organizationId: string, conversationId: string): Promise<void> {
    const conversation = await this.database.conversation.findFirst({
      where: { id: conversationId, organizationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
    }

    const readAt = new Date();
    await this.database.$transaction([
      this.database.conversation.update({
        where: { id: conversation.id },
        data: { unreadCount: 0 },
      }),
      this.database.message.updateMany({
        where: {
          organizationId,
          conversationId: conversation.id,
          direction: MessageDirection.INBOUND,
          readAt: null,
        },
        data: { readAt },
      }),
    ]);
  }

  async options(organizationId: string) {
    const [accounts, users] = await Promise.all([
      this.database.whatsappAccount.findMany({ where: { organizationId }, select: { id: true, name: true, phoneNumber: true }, orderBy: { name: "asc" } }),
      this.database.user.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    return { accounts, users };
  }

  async updateStatus(organizationId: string, userId: string, conversationId: string, input: UpdateConversationStatusInput) {
    const conversation = await this.database.conversation.findFirst({ where: { id: conversationId, organizationId }, select: { id: true, status: true } });
    if (!conversation) throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
    const updated = await this.database.conversation.update({ where: { id: conversation.id }, data: { status: input.status }, select: conversationSelect });
    await this.audit?.log({ organizationId, userId, action: "CONVERSATION_STATUS_UPDATED", entityType: "Conversation", entityId: conversation.id, metadata: { from: conversation.status, to: input.status } });
    return updated;
  }
}
