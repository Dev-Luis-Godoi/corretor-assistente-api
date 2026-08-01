import type { PrismaClient } from "@/generated/prisma/client.js";
import type { Prisma } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";

import type { ListMessagesQuery } from "./message.schemas.js";

const messageSelect = {
  id: true,
  externalId: true,
  direction: true,
  type: true,
  content: true,
  mediaUrl: true,
  sentAt: true,
  readAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MessageSelect;

type MessageView = Prisma.MessageGetPayload<{ select: typeof messageSelect }>;

interface MessageList {
  data: MessageView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class MessageService {
  constructor(private readonly database: PrismaClient) {}

  async listByConversation(
    organizationId: string,
    conversationId: string,
    query: ListMessagesQuery,
  ): Promise<MessageList> {
    const conversation = await this.database.conversation.findFirst({
      where: { id: conversationId, organizationId },
      select: { id: true },
    });

    if (!conversation) {
      throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
    }

    const where = {
      organizationId,
      conversationId: conversation.id,
      direction: query.direction,
      type: query.type,
    } satisfies Prisma.MessageWhereInput;

    const [messages, total] = await this.database.$transaction([
      this.database.message.findMany({
        where,
        select: messageSelect,
        orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.message.count({ where }),
    ]);

    return {
      data: messages,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
