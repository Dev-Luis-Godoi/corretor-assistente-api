import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";

import { env } from "@/config/env.js";
import { prisma } from "@/infra/database/prisma.js";
import { authRoutes } from "@/modules/auth/routes.js";
import { automationRoutes } from "@/modules/automations/automation.routes.js";
import { contactRoutes } from "@/modules/contacts/contact.routes.js";
import { dashboardRoutes } from "@/modules/dashboard/dashboard.routes.js";
import { leadRoutes } from "@/modules/leads/routes.js";
import { pipelineRoutes } from "@/modules/pipelines/pipeline.routes.js";
import { taskRoutes } from "@/modules/tasks/task.routes.js";
import { userRoutes } from "@/modules/users/routes.js";
import { whatsappRoutes } from "@/modules/whatsapp/whatsapp.routes.js";
import { evolutionWebhookRoutes } from "@/modules/whatsapp/evolution-webhook.routes.js";
import { errorHandler } from "@/shared/http/error-handler.js";

export function buildApp() {
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
  });
  app.register(cookie);
  app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: "accessToken",
      signed: false,
    },
  });

  app.setErrorHandler(errorHandler);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  app.register(authRoutes, { prefix: "/auth" });
  app.register(automationRoutes, { prefix: "/automations" });
  app.register(contactRoutes, { prefix: "/contacts" });
  app.register(dashboardRoutes, { prefix: "/dashboard" });
  app.register(leadRoutes, { prefix: "/leads" });
  app.register(pipelineRoutes, { prefix: "/pipeline" });
  app.register(taskRoutes, { prefix: "/tasks" });
  app.register(userRoutes, { prefix: "/users" });
  app.register(whatsappRoutes, { prefix: "/whatsapp" });
  app.register(evolutionWebhookRoutes, { prefix: "/webhooks/evolution" });
  app.get("/health", () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}
