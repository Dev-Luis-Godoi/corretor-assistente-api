import type { FastifyInstance } from "fastify";

import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";

import { ConversationController } from "./conversation.controller.js";
import { ConversationService } from "./conversation.service.js";
import { MessageController } from "./message.controller.js";
import { MessageService } from "./message.service.js";

export function whatsappRoutes(app: FastifyInstance) {
  const conversationService = new ConversationService(prisma);
  const messageService = new MessageService(prisma);
  const conversationController = new ConversationController(conversationService);
  const messageController = new MessageController(messageService);

  app.addHook("preHandler", authMiddleware);

  app.get("/conversations", conversationController.list.bind(conversationController));
  app.get("/conversations/:id", conversationController.getById.bind(conversationController));
  app.get(
    "/conversations/:conversationId/messages",
    messageController.listByConversation.bind(messageController),
  );
}
