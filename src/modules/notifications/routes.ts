import type { FastifyInstance } from "fastify";
import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";
import { NotificationController } from "./controller.js";
import { NotificationService } from "./service.js";

export function notificationRoutes(app:FastifyInstance){const controller=new NotificationController(new NotificationService(prisma));app.addHook("preHandler",authMiddleware);app.get("/",controller.list.bind(controller));app.post("/dismiss",controller.dismiss.bind(controller));}
