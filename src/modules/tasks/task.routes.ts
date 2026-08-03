import type { FastifyInstance } from "fastify";
import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";
import { TaskController } from "./task.controller.js";
import { TaskService } from "./task.service.js";

export function taskRoutes(app: FastifyInstance) {
  const controller = new TaskController(new TaskService(prisma));
  app.addHook("preHandler", authMiddleware);
  app.get("/", controller.list.bind(controller));
  app.post("/", controller.create.bind(controller));
  app.patch("/:id", controller.update.bind(controller));
  app.delete("/:id", controller.remove.bind(controller));
}
