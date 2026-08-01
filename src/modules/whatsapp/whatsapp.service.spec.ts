import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client.js";

import { ConversationService } from "./conversation.service.js";
import { MessageService } from "./message.service.js";

const conversationFindFirst = vi.fn();

const database = {
  conversation: {
    findFirst: conversationFindFirst,
  },
} as unknown as PrismaClient;

const organizationId = "00000000-0000-4000-8000-000000000001";
const conversationId = "00000000-0000-4000-8000-000000000002";

describe("WhatsApp services tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conversationFindFirst.mockResolvedValue(null);
  });

  it("scopes conversation details to the authenticated organization", async () => {
    const service = new ConversationService(database);

    await expect(service.getById(organizationId, conversationId)).rejects.toMatchObject({
      code: "CONVERSATION_NOT_FOUND",
    });

    expect(conversationFindFirst).toHaveBeenCalledOnce();
    expect(JSON.stringify(conversationFindFirst.mock.calls)).toContain(conversationId);
    expect(JSON.stringify(conversationFindFirst.mock.calls)).toContain(organizationId);
  });

  it("scopes message history to a conversation in the authenticated organization", async () => {
    const service = new MessageService(database);

    await expect(
      service.listByConversation(organizationId, conversationId, { page: 1, limit: 50 }),
    ).rejects.toMatchObject({ code: "CONVERSATION_NOT_FOUND" });

    expect(conversationFindFirst).toHaveBeenCalledWith({
      where: { id: conversationId, organizationId },
      select: { id: true },
    });
  });
});
