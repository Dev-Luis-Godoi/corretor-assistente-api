import type { FastifyInstance } from "fastify";
import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";

export function dashboardRoutes(app: FastifyInstance) {
  const controller = new DashboardController(new DashboardService(prisma));
  app.get("/summary", { preHandler: authMiddleware }, controller.summary.bind(controller));
}
