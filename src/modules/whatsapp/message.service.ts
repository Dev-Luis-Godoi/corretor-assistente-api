import { MessageDirection, MessageType, type PrismaClient } from "@/generated/prisma/client.js";
import type { Prisma } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";

import type { ListMessagesQuery, SendTextMessageInput } from "./message.schemas.js";
import { EvolutionClient } from "./evolution.client.js";

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
  constructor(private readonly database: PrismaClient, private readonly evolutionClient = new EvolutionClient()) {}

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
  async sendText(organizationId: string, conversationId: string, input: SendTextMessageInput) {
    const conversation = await this.database.conversation.findFirst({ where: { id: conversationId, organizationId }, select: { id: true, contact: { select: { phone: true } }, whatsappAccount: { select: { instanceName: true, isConnected: true } } } });
    if (!conversation) throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
    if (!conversation.whatsappAccount.instanceName || !conversation.whatsappAccount.isConnected) throw new AppError("WhatsApp account is not connected", 409, "WHATSAPP_NOT_CONNECTED");
    const result = await this.evolutionClient.sendText(conversation.whatsappAccount.instanceName, conversation.contact.phone, input.content);
    const sentAt = new Date();
    const message = await this.database.message.create({ data: { organizationId, conversationId, externalId: result.key?.id, direction: MessageDirection.OUTBOUND, type: MessageType.TEXT, content: input.content, sentAt }, select: messageSelect });
    await this.database.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: sentAt } });
    return message;
  }
}
