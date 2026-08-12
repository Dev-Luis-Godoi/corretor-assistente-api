import type { FastifyReply, FastifyRequest } from "fastify";

import { AccountStatus, UserRole } from "@/generated/prisma/enums.js";
import { prisma } from "@/infra/database/prisma.js";
import { AppError } from "@/shared/errors/app-error.js";

export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const token = await request.brokerJwtVerify<{
    sub: string;
    organizationId: string;
    role: UserRole;
    sessionVersion?: number;
    scope?: string;
  }>();
  if (token.scope && token.scope !== "broker")
    throw new AppError("Invalid session scope", 401, "INVALID_SESSION");

  // Tokens issued before session versioning remain valid only until their
  // original expiration, preventing a disruptive migration for active users.
  if (typeof token.sessionVersion === "number") {
    const user = await prisma.user.findFirst({
      where: { id: token.sub, organizationId: token.organizationId },
      select: { sessionVersion: true, organization: { select: { status: true } } },
    });
    if (!user || user.sessionVersion !== token.sessionVersion)
      throw new AppError("Session has been revoked", 401, "SESSION_REVOKED");
    if (user.organization.status === AccountStatus.SUSPENDED)
      throw new AppError("Account is suspended", 403, "ACCOUNT_SUSPENDED");
    if (user.organization.status === AccountStatus.CANCELED)
      throw new AppError("Account is canceled", 403, "ACCOUNT_CANCELED");
  }
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
