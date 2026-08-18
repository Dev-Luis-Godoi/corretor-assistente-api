import type { FastifyInstance } from "fastify";
import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";
import { RelationshipController } from "./relationship.controller.js";
import { RelationshipService } from "./relationship.service.js";
export function ownerRoutes(app: FastifyInstance) {
  const controller = new RelationshipController(new RelationshipService(prisma));
  app.addHook("preHandler", authMiddleware);
  app.get("/", controller.listOwners.bind(controller));
  app.post("/", controller.createOwner.bind(controller));
  app.patch("/:id", controller.updateOwner.bind(controller));
  app.delete("/:id", controller.deleteOwner.bind(controller));
}
export function clientRoutes(app: FastifyInstance) {
  const controller = new RelationshipController(new RelationshipService(prisma));
  app.addHook("preHandler", authMiddleware);
  app.get("/", controller.listClients.bind(controller));
  app.post("/", controller.createClient.bind(controller));
  app.patch("/:id", controller.updateClient.bind(controller));
  app.delete("/:id", controller.deleteClient.bind(controller));
}
