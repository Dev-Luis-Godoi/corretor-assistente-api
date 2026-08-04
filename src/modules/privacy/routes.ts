import type {FastifyInstance} from "fastify";
import {prisma} from "@/infra/database/prisma.js";
import {authMiddleware,organizationAdminMiddleware} from "@/shared/http/auth.middleware.js";
import {AuditService} from "@/shared/audit/audit.service.js";
import {PrivacyController} from "./controller.js";
import {PrivacyService} from "./service.js";

export function privacyRoutes(app:FastifyInstance){const controller=new PrivacyController(new PrivacyService(prisma,new AuditService(prisma)));app.addHook("preHandler",authMiddleware);app.addHook("preHandler",organizationAdminMiddleware);app.get("/settings",controller.settings.bind(controller));app.patch("/settings",controller.updateRetention.bind(controller));app.get("/export",controller.exportOrganization.bind(controller));app.post("/retention/apply",controller.applyRetention.bind(controller));app.get("/audit-logs",controller.auditLogs.bind(controller));app.get("/contacts/:contactId/export",controller.exportContact.bind(controller));app.patch("/contacts/:contactId/consent",controller.updateConsent.bind(controller));app.delete("/contacts/:contactId",controller.deleteContact.bind(controller));}
