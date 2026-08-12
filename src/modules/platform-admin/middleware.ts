import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@/infra/database/prisma.js";
import { AppError } from "@/shared/errors/app-error.js";

interface PlatformAdminToken {
  sub: string;
  scope: "platform-admin";
  sessionVersion: number;
}

export async function platformAdminMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const token = await request.platformAdminJwtVerify<PlatformAdminToken>();
  if (token.scope !== "platform-admin")
    throw new AppError("Invalid administrator session", 401, "PLATFORM_ADMIN_UNAUTHORIZED");
  const admin = await prisma.platformAdmin.findUnique({
    where: { id: token.sub },
    select: { active: true, sessionVersion: true },
  });
  if (!admin?.active || admin.sessionVersion !== token.sessionVersion)
    throw new AppError(
      "Administrator session has been revoked",
      401,
      "PLATFORM_ADMIN_UNAUTHORIZED",
    );
  request.platformAdmin = token;
}
