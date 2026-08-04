import type { FastifyInstance } from "fastify";

import { prisma } from "@/infra/database/prisma.js";
import {
  authMiddleware,
  organizationAdminMiddleware,
} from "@/shared/http/auth.middleware.js";
import { createRateLimit } from "@/shared/http/rate-limit.js";

import { ConversationController } from "./conversation.controller.js";
import { ConversationService } from "./conversation.service.js";
import { MessageController } from "./message.controller.js";
import { MessageService } from "./message.service.js";
import { EvolutionAccountController } from "./evolution-account.controller.js";
import { EvolutionAccountService } from "./evolution-account.service.js";
import { AuditService } from "@/shared/audit/audit.service.js";

export function whatsappRoutes(app: FastifyInstance) {
  const accountCreationRateLimit = createRateLimit(5, 60 * 60_000);
  const mediaRateLimit = createRateLimit(30, 60_000);
  const conversationService = new ConversationService(prisma, new AuditService(prisma));
  const messageService = new MessageService(prisma);
  const conversationController = new ConversationController(conversationService);
  const messageController = new MessageController(messageService);
  const evolutionAccountController = new EvolutionAccountController(new EvolutionAccountService(prisma));

  app.addHook("preHandler", authMiddleware);

  app.get("/conversations", conversationController.list.bind(conversationController));
  app.get("/conversation-options", conversationController.options.bind(conversationController));
  app.get("/conversations/:id", conversationController.getById.bind(conversationController));
  app.patch(
    "/conversations/:id/read",
    conversationController.markAsRead.bind(conversationController),
  );
  app.patch("/conversations/:id/status", conversationController.updateStatus.bind(conversationController));
  app.get(
    "/conversations/:conversationId/messages",
    messageController.listByConversation.bind(messageController),
  );
  app.post("/conversations/:conversationId/messages", messageController.sendText.bind(messageController));
  app.post("/conversations/:conversationId/media", { bodyLimit: 8_000_000, preHandler: mediaRateLimit }, messageController.sendMedia.bind(messageController));
  app.get(
    "/accounts",
    { preHandler: organizationAdminMiddleware },
    evolutionAccountController.list.bind(evolutionAccountController),
  );
  app.post(
    "/accounts",
    { preHandler: [organizationAdminMiddleware, accountCreationRateLimit] },
    evolutionAccountController.create.bind(evolutionAccountController),
  );
  app.get(
    "/accounts/:accountId/connect",
    { preHandler: organizationAdminMiddleware },
    evolutionAccountController.connect.bind(evolutionAccountController),
  );
  app.get(
    "/accounts/:accountId/status",
    { preHandler: organizationAdminMiddleware },
    evolutionAccountController.status.bind(evolutionAccountController),
  );
  app.post(
    "/accounts/:accountId/configure-evolution",
    { preHandler: organizationAdminMiddleware },
    evolutionAccountController.configureWebhook.bind(evolutionAccountController),
  );
}
