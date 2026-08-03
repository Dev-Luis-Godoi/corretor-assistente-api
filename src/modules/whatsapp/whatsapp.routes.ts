import type { FastifyInstance } from "fastify";

import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";

import { ConversationController } from "./conversation.controller.js";
import { ConversationService } from "./conversation.service.js";
import { MessageController } from "./message.controller.js";
import { MessageService } from "./message.service.js";
import { EvolutionAccountController } from "./evolution-account.controller.js";
import { EvolutionAccountService } from "./evolution-account.service.js";

export function whatsappRoutes(app: FastifyInstance) {
  const conversationService = new ConversationService(prisma);
  const messageService = new MessageService(prisma);
  const conversationController = new ConversationController(conversationService);
  const messageController = new MessageController(messageService);
  const evolutionAccountController = new EvolutionAccountController(new EvolutionAccountService(prisma));

  app.addHook("preHandler", authMiddleware);

  app.get("/conversations", conversationController.list.bind(conversationController));
  app.get("/conversations/:id", conversationController.getById.bind(conversationController));
  app.get(
    "/conversations/:conversationId/messages",
    messageController.listByConversation.bind(messageController),
  );
  app.post("/conversations/:conversationId/messages", messageController.sendText.bind(messageController));
  app.post("/accounts/:accountId/configure-evolution", evolutionAccountController.configureWebhook.bind(evolutionAccountController));
}
