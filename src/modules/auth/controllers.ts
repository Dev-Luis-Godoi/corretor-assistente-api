import type { FastifyReply, FastifyRequest } from "fastify";

import { env } from "@/config/env.js";

import type { AuthUser } from "./auth.types.js";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "./schemas.js";
import type { AuthService } from "./service.js";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(request: FastifyRequest, reply: FastifyReply) {
    const input = registerSchema.parse(request.body);
    const user = await this.authService.register(input);

    await this.setAccessToken(reply, user);

    return reply.status(201).send({ user });
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const input = loginSchema.parse(request.body);
    const user = await this.authService.login(input);

    await this.setAccessToken(reply, user);

    return reply.send({ user });
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const user = await this.authService.me(request.user.sub);

    return reply.send({ user });
  }

  async logout(_request: FastifyRequest, reply: FastifyReply) {
    reply.clearCookie("accessToken", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return reply.status(204).send();
  }

  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    await this.authService.requestPasswordReset(forgotPasswordSchema.parse(request.body));
    return reply.send({ message: "If the account exists, reset instructions will be sent" });
  }

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    await this.authService.resetPassword(resetPasswordSchema.parse(request.body));
    return reply.status(204).send();
  }

  private async setAccessToken(reply: FastifyReply, user: AuthUser) {
    const token = await reply.jwtSign(
      {
        organizationId: user.organization.id,
        role: user.role,
      },
      {
        sign: {
          sub: user.id,
          expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        },
      },
    );

    reply.setCookie("accessToken", token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
    });
  }
}
