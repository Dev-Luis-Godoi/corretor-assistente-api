import type { FastifyInstance } from "fastify";

import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";

import { PipelineController } from "./pipeline.controller.js";
import { PipelineService } from "./pipeline.service.js";

export function pipelineRoutes(app: FastifyInstance) {
  const pipelineService = new PipelineService(prisma);
  const pipelineController = new PipelineController(pipelineService);

  app.addHook("preHandler", authMiddleware);

  app.get("/stages", pipelineController.listStages.bind(pipelineController));
  app.post("/stages", pipelineController.createStage.bind(pipelineController));
  app.patch("/stages/reorder", pipelineController.reorderStages.bind(pipelineController));
  app.patch("/stages/:stageId", pipelineController.updateStage.bind(pipelineController));
  app.delete("/stages/:stageId", pipelineController.deleteStage.bind(pipelineController));
}
