import type { FastifyInstance } from "fastify";

import { prisma } from "@/infra/database/prisma.js";
import { PasswordService } from "@/shared/crypto/password.service.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";

import { AuthController } from "./controllers.js";
import { AuthService } from "./service.js";

export function authRoutes(app: FastifyInstance) {
  const passwordService = new PasswordService();
  const authService = new AuthService(prisma, passwordService);
  const authController = new AuthController(authService);

  app.post("/register", authController.register.bind(authController));

  app.post("/login", authController.login.bind(authController));

  app.get(
    "/me",
    {
      preHandler: authMiddleware,
    },
    authController.me.bind(authController),
  );
}
