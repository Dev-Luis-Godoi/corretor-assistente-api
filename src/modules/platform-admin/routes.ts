import type { FastifyInstance } from "fastify";
import { prisma } from "@/infra/database/prisma.js";
import { PasswordService } from "@/shared/crypto/password.service.js";
import { createRateLimit } from "@/shared/http/rate-limit.js";
import { PlatformAdminController } from "./controller.js";
import { platformAdminMiddleware } from "./middleware.js";
import { PlatformAdminService } from "./service.js";

export function platformAdminRoutes(app: FastifyInstance) {
  const controller = new PlatformAdminController(
    new PlatformAdminService(prisma, new PasswordService()),
  );
  const loginRateLimit = createRateLimit(5, 15 * 60_000);
  app.post("/auth/login", { preHandler: loginRateLimit }, controller.login.bind(controller));
  app.post("/auth/logout", controller.logout.bind(controller));
  app.get("/auth/me", { preHandler: platformAdminMiddleware }, controller.me.bind(controller));
  app.get(
    "/overview",
    { preHandler: platformAdminMiddleware },
    controller.overview.bind(controller),
  );
  app.get(
    "/accounts",
    { preHandler: platformAdminMiddleware },
    controller.listAccounts.bind(controller),
  );
  app.patch(
    "/accounts/:id/status",
    { preHandler: platformAdminMiddleware },
    controller.updateStatus.bind(controller),
  );
  app.post(
    "/accounts/:id/revoke-sessions",
    { preHandler: platformAdminMiddleware },
    controller.revokeSessions.bind(controller),
  );
}
