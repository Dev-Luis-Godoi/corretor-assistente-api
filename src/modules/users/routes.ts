import type { FastifyInstance } from "fastify";
import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";
import { PasswordService } from "@/shared/crypto/password.service.js";
import { createRateLimit } from "@/shared/http/rate-limit.js";
import { UserController } from "./controller.js";
import { UserService } from "./service.js";

export function userRoutes(app: FastifyInstance) {
  const controller = new UserController(new UserService(prisma, new PasswordService()));
  const passwordRateLimit = createRateLimit(5, 15 * 60_000);
  app.addHook("preHandler", authMiddleware);
  app.get("/", controller.list.bind(controller));
  app.patch("/me", controller.updateProfile.bind(controller));
  app.patch("/me/password", { preHandler: passwordRateLimit }, controller.updatePassword.bind(controller));
}
