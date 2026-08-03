import type { FastifyInstance } from "fastify";
import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware, organizationManagerMiddleware } from "@/shared/http/auth.middleware.js";
import { OrganizationController } from "./controller.js";
import { OrganizationService } from "./service.js";

export function organizationRoutes(app: FastifyInstance) {
  const controller = new OrganizationController(new OrganizationService(prisma));
  app.addHook("preHandler", authMiddleware);
  app.get("/", controller.get.bind(controller));
  app.patch("/", { preHandler: organizationManagerMiddleware }, controller.update.bind(controller));
}
