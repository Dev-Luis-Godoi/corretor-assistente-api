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
  app.get("/", leadController.list.bind(leadController));
  app.patch("/:id/stage", leadController.updateStage.bind(leadController));
}
