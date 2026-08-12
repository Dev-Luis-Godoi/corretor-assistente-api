import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client.js";

import { EvolutionWebhookService } from "./evolution-webhook.service.js";

const whatsappAccountFindFirst = vi.fn();
type ContactUpsertArgs = {
  create: { name?: string };
  update: { name?: string };
};

const contactUpsert = vi.fn<(args: ContactUpsertArgs) => Promise<{ id: string }>>();
const conversationUpsert = vi.fn();
const messageUpsert = vi.fn();

const transactionClient = {
  contact: { upsert: contactUpsert },
  conversation: { upsert: conversationUpsert },
  message: { upsert: messageUpsert },
};

const database = {
  whatsappAccount: { findFirst: whatsappAccountFindFirst },
  $transaction: vi.fn((callback: (transaction: typeof transactionClient) => unknown) =>
    Promise.resolve(callback(transactionClient)),
  ),
} as unknown as PrismaClient;

const accountId = "00000000-0000-4000-8000-000000000001";
const organizationId = "00000000-0000-4000-8000-000000000002";

function messageData(fromMe: boolean, pushName: string) {
  return {
    key: {
      id: fromMe ? "outbound-message" : "inbound-message",
      remoteJid: "5511999999999@s.whatsapp.net",
      fromMe,
    },
    pushName,
    messageType: "conversation",
    messageTimestamp: 1_786_483_200,
    message: { conversation: "Olá" },
  };
}

describe("EvolutionWebhookService contact names", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    whatsappAccountFindFirst.mockResolvedValue({ id: accountId, organizationId });
    contactUpsert.mockResolvedValue({ id: "contact-id" });
    conversationUpsert.mockResolvedValue({ id: "conversation-id" });
    messageUpsert.mockResolvedValue({ id: "message-id" });
  });

  it("does not use the broker name from an outbound message as the contact name", async () => {
    const service = new EvolutionWebhookService(database);

    await service.handle(
      accountId,
      "my-instance",
      "MESSAGES_UPSERT",
      messageData(true, "Luis Godoi"),
    );

    const upsert = contactUpsert.mock.calls[0]?.[0];
    expect(upsert?.create.name).toBeUndefined();
    expect(upsert?.update).toEqual({});
  });

  it("creates and corrects the contact name from an inbound message", async () => {
    const service = new EvolutionWebhookService(database);

    await service.handle(
      accountId,
      "my-instance",
      "MESSAGES_UPSERT",
      messageData(false, " Maria Souza "),
    );

    const upsert = contactUpsert.mock.calls[0]?.[0];
    expect(upsert?.create.name).toBe("Maria Souza");
    expect(upsert?.update).toEqual({ name: "Maria Souza" });
  });
});
