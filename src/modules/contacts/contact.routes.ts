import type { FastifyInstance } from "fastify";

import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";

import { ContactController } from "./contact.controller.js";
import { ContactService } from "./contact.service.js";

export function contactRoutes(app: FastifyInstance) {
  const contactService = new ContactService(prisma);
  const contactController = new ContactController(contactService);

  app.addHook("preHandler", authMiddleware);

  app.post("/", contactController.create.bind(contactController));
  app.get("/", contactController.list.bind(contactController));
  app.get("/:contactId", contactController.getById.bind(contactController));
  app.patch("/:contactId", contactController.update.bind(contactController));
  app.delete("/:contactId", contactController.delete.bind(contactController));
}
