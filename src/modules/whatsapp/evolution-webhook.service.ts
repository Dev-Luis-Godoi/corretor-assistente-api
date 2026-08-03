import { MessageDeliveryStatus, MessageDirection, MessageType, type PrismaClient } from "@/generated/prisma/client.js";
import { evolutionMessageDataSchema } from "./evolution.schemas.js";

const typeMap: Record<string, MessageType> = { conversation: MessageType.TEXT, extendedTextMessage: MessageType.TEXT, imageMessage: MessageType.IMAGE, audioMessage: MessageType.AUDIO, videoMessage: MessageType.VIDEO, documentMessage: MessageType.DOCUMENT };

export class EvolutionWebhookService {
  constructor(private readonly database: PrismaClient) {}

  async handle(accountId: string, instanceName: string, event: string, rawData: unknown) {
    const account = await this.database.whatsappAccount.findFirst({ where: { id: accountId, instanceName }, select: { id: true, organizationId: true } });
    if (!account) return;
    if (event.toUpperCase().replace(/\./g, "_") === "CONNECTION_UPDATE") {
      const state = typeof rawData === "object" && rawData && "state" in rawData ? String(rawData.state) : "";
      await this.database.whatsappAccount.update({ where: { id: account.id }, data: { isConnected: state === "open" } });
      return;
    }
    const normalizedEvent = event.toUpperCase().replace(/\./g, "_");
    if (normalizedEvent === "MESSAGES_UPDATE") {
      const updates = Array.isArray(rawData) ? rawData : [rawData];
      for (const rawUpdate of updates) {
        if (!rawUpdate || typeof rawUpdate !== "object") continue;
        const update = rawUpdate as { key?: { id?: unknown }; update?: { status?: unknown } };
        const externalId = typeof update.key?.id === "string" ? update.key.id : null;
        const status = Number(update.update?.status);
        if (!externalId || !Number.isFinite(status)) continue;
        const deliveryStatus = status >= 4 ? MessageDeliveryStatus.READ : status >= 3 ? MessageDeliveryStatus.DELIVERED : status === 0 ? MessageDeliveryStatus.FAILED : MessageDeliveryStatus.SENT;
        await this.database.message.updateMany({ where: { organizationId: account.organizationId, externalId }, data: { deliveryStatus, deliveredAt: status >= 3 ? new Date() : undefined, readAt: status >= 4 ? new Date() : undefined } });
      }
      return;
    }
    if (normalizedEvent !== "MESSAGES_UPSERT") return;
    const parsed = evolutionMessageDataSchema.safeParse(rawData);
    if (!parsed.success || parsed.data.key.remoteJid.endsWith("@g.us")) return;
    const data = parsed.data;
    const phone = data.key.remoteJid.split("@")[0]?.replace(/\D/g, "");
    if (!phone) return;
    const messageEntry = Object.entries(data.message).find(([key]) => key in typeMap);
    const rawMessageType = messageEntry?.[0] ?? data.messageType ?? "unknown";
    const content = data.message.conversation ?? data.message.extendedTextMessage?.text ?? data.message.imageMessage?.caption ?? data.message.videoMessage?.caption ?? data.message.documentMessage?.caption ?? null;
    const mediaUrl = data.message.imageMessage?.url ?? data.message.audioMessage?.url ?? data.message.videoMessage?.url ?? data.message.documentMessage?.url ?? null;
    const timestamp = Number(data.messageTimestamp);
    const sentAt = Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp * 1_000) : new Date();
    await this.database.$transaction(async (transaction) => {
      const contact = await transaction.contact.upsert({ where: { organizationId_phone: { organizationId: account.organizationId, phone } }, create: { organizationId: account.organizationId, phone, name: data.pushName }, update: {}, select: { id: true } });
      const conversation = await transaction.conversation.upsert({ where: { whatsappAccountId_contactId: { whatsappAccountId: account.id, contactId: contact.id } }, create: { organizationId: account.organizationId, whatsappAccountId: account.id, contactId: contact.id, externalId: data.key.remoteJid, lastMessageAt: sentAt, unreadCount: data.key.fromMe ? 0 : 1 }, update: { lastMessageAt: sentAt, ...(data.key.fromMe ? {} : { unreadCount: { increment: 1 } }) }, select: { id: true } });
      await transaction.message.upsert({ where: { conversationId_externalId: { conversationId: conversation.id, externalId: data.key.id } }, create: { organizationId: account.organizationId, conversationId: conversation.id, externalId: data.key.id, direction: data.key.fromMe ? MessageDirection.OUTBOUND : MessageDirection.INBOUND, type: typeMap[rawMessageType] ?? MessageType.UNKNOWN, content, mediaUrl, sentAt }, update: { content, mediaUrl, type: typeMap[rawMessageType] ?? MessageType.UNKNOWN } });
    });
  }
}
