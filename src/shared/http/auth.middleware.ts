import type { FastifyReply, FastifyRequest } from "fastify";

import { UserRole } from "@/generated/prisma/enums.js";
import { AppError } from "@/shared/errors/app-error.js";

export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  await request.jwtVerify();
}

export function organizationAdminMiddleware(request: FastifyRequest) {
  if (request.user.role !== UserRole.OWNER && request.user.role !== UserRole.ADMIN) {
    throw new AppError(
      "Only organization administrators can manage WhatsApp accounts",
      403,
      "WHATSAPP_ACCOUNT_FORBIDDEN",
    );
  }

  return Promise.resolve();
}

export function organizationManagerMiddleware(request: FastifyRequest) {
  if (request.user.role !== UserRole.OWNER && request.user.role !== UserRole.ADMIN) {
    throw new AppError(
      "Only organization administrators can perform this action",
      403,
      "ORGANIZATION_ADMIN_REQUIRED",
    );
  }

  return Promise.resolve();
}
