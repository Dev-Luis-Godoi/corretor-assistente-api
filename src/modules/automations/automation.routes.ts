import type { FastifyInstance } from "fastify";
import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware, organizationManagerMiddleware } from "@/shared/http/auth.middleware.js";
import { AutomationController } from "./automation.controller.js";
import { AutomationService } from "./automation.service.js";

export function automationRoutes(app: FastifyInstance) {
  const controller = new AutomationController(new AutomationService(prisma));
  app.addHook("preHandler", authMiddleware);
  app.get("/templates", controller.listTemplates.bind(controller));
  app.post("/templates", controller.createTemplate.bind(controller));
  app.patch("/templates/:id", controller.updateTemplate.bind(controller));
  app.delete("/templates/:id", controller.deleteTemplate.bind(controller));
  app.get("/rules", controller.listRules.bind(controller));
  app.post("/rules", { preHandler: organizationManagerMiddleware }, controller.createRule.bind(controller));
  app.patch("/rules/:id", { preHandler: organizationManagerMiddleware }, controller.updateRule.bind(controller));
  app.delete("/rules/:id", { preHandler: organizationManagerMiddleware }, controller.deleteRule.bind(controller));
}
