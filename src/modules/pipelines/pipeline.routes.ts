import type { FastifyInstance } from "fastify";

import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware, organizationManagerMiddleware } from "@/shared/http/auth.middleware.js";

import { PipelineController } from "./pipeline.controller.js";
import { PipelineService } from "./pipeline.service.js";

export function pipelineRoutes(app: FastifyInstance) {
  const pipelineService = new PipelineService(prisma);
  const pipelineController = new PipelineController(pipelineService);

  app.addHook("preHandler", authMiddleware);

  app.get("/stages", pipelineController.listStages.bind(pipelineController));
  app.post("/stages", { preHandler: organizationManagerMiddleware }, pipelineController.createStage.bind(pipelineController));
  app.patch("/stages/reorder", { preHandler: organizationManagerMiddleware }, pipelineController.reorderStages.bind(pipelineController));
  app.patch("/stages/:stageId", { preHandler: organizationManagerMiddleware }, pipelineController.updateStage.bind(pipelineController));
  app.delete("/stages/:stageId", { preHandler: organizationManagerMiddleware }, pipelineController.deleteStage.bind(pipelineController));
}
