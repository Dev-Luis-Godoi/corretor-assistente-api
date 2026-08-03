import type { FastifyInstance } from "fastify";

import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";

import { LeadController } from "./controllers.js";
import { LeadService } from "./service.js";

export function leadRoutes(app: FastifyInstance) {
  const leadService = new LeadService(prisma);
  const leadController = new LeadController(leadService);

  app.addHook("preHandler", authMiddleware);

  app.post("/", leadController.create.bind(leadController));
  app.post("/from-conversation/:conversationId", leadController.createFromConversation.bind(leadController));
  app.get("/", leadController.list.bind(leadController));
  app.get("/:id", leadController.getById.bind(leadController));
  app.patch("/:id", leadController.update.bind(leadController));
  app.patch("/:id/stage", leadController.updateStage.bind(leadController));
  app.post("/:id/activities", leadController.addActivity.bind(leadController));
}
