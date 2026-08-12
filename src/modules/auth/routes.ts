import type { FastifyInstance } from "fastify";

import { prisma } from "@/infra/database/prisma.js";
import { PasswordService } from "@/shared/crypto/password.service.js";
import { ResendEmailService } from "@/shared/email/resend-email.service.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";
import { createRateLimit } from "@/shared/http/rate-limit.js";

import { AuthController } from "./controllers.js";
import { AuthService } from "./service.js";

export function authRoutes(app: FastifyInstance) {
  const authRateLimit = createRateLimit(10, 15 * 60_000);
  const resetRateLimit = createRateLimit(5, 60 * 60_000);
  const passwordService = new PasswordService();
  const authService = new AuthService(prisma, passwordService, new ResendEmailService());
  const authController = new AuthController(authService);

  app.post(
    "/register",
    { preHandler: authRateLimit },
    authController.register.bind(authController),
  );

  app.post("/login", { preHandler: authRateLimit }, authController.login.bind(authController));

  app.post("/logout", authController.logout.bind(authController));
  app.post(
    "/forgot-password",
    { preHandler: resetRateLimit },
    authController.forgotPassword.bind(authController),
  );
  app.post(
    "/reset-password",
    { preHandler: resetRateLimit },
    authController.resetPassword.bind(authController),
  );

  app.get(
    "/me",
    {
      preHandler: authMiddleware,
    },
    authController.me.bind(authController),
  );
}
