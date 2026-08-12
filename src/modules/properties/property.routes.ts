import type { FastifyInstance } from "fastify";

import { prisma } from "@/infra/database/prisma.js";
import { authMiddleware } from "@/shared/http/auth.middleware.js";
import { R2ObjectStorageService } from "@/shared/storage/r2-object-storage.service.js";

import { PropertyController } from "./property.controller.js";
import { PropertyService } from "./property.service.js";

export function propertyRoutes(app: FastifyInstance) {
  const controller = new PropertyController(
    new PropertyService(prisma, new R2ObjectStorageService()),
  );
  app.addHook("preHandler", authMiddleware);
  app.get("/", controller.list.bind(controller));
  app.get("/storage-status", controller.storageStatus.bind(controller));
  app.post("/", controller.create.bind(controller));
  app.get("/:id", controller.getById.bind(controller));
  app.patch("/:id", controller.update.bind(controller));
  app.post("/:id/photos/upload-url", controller.preparePhotoUpload.bind(controller));
  app.post("/:id/photos", controller.confirmPhoto.bind(controller));
  app.patch("/:id/photos/:photoId/cover", controller.setCover.bind(controller));
  app.delete("/:id/photos/:photoId", controller.removePhoto.bind(controller));
}
