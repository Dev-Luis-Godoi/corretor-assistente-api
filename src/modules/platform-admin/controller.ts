import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "@/config/env.js";
import {
  platformAccountParamsSchema,
  platformAccountsQuerySchema,
  platformAdminLoginSchema,
  updatePlatformAccountStatusSchema,
} from "./schemas.js";
import type { PlatformAdminService } from "./service.js";

const ADMIN_TOKEN_TTL_SECONDS = 60 * 60 * 8;

export class PlatformAdminController {
  constructor(private readonly service: PlatformAdminService) {}

  async login(request: FastifyRequest, reply: FastifyReply) {
    const admin = await this.service.login(platformAdminLoginSchema.parse(request.body));
    const token = await reply.platformAdminJwtSign(
      { scope: "platform-admin", sessionVersion: admin.sessionVersion },
      { sign: { sub: admin.id, expiresIn: ADMIN_TOKEN_TTL_SECONDS } },
    );
    reply.setCookie("adminAccessToken", token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_TOKEN_TTL_SECONDS,
    });
    return reply.send({ admin });
  }

  async logout(_request: FastifyRequest, reply: FastifyReply) {
    reply.clearCookie("adminAccessToken", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    return reply.status(204).send();
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ admin: await this.service.me(request.platformAdmin.sub) });
  }

  async overview(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await this.service.overview());
  }

  async listAccounts(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(
      await this.service.listAccounts(platformAccountsQuerySchema.parse(request.query)),
    );
  }

  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = platformAccountParamsSchema.parse(request.params);
    const { status } = updatePlatformAccountStatusSchema.parse(request.body);
    return reply.send({
      account: await this.service.updateStatus(request.platformAdmin.sub, id, status),
    });
  }

  async revokeSessions(request: FastifyRequest, reply: FastifyReply) {
    const { id } = platformAccountParamsSchema.parse(request.params);
    await this.service.revokeSessions(request.platformAdmin.sub, id);
    return reply.status(204).send();
  }
}
