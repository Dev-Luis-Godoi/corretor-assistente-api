import type { AccountStatus, UserRole } from "@/generated/prisma/enums.js";
import type { JwtSignFunction, JwtVerifyFunction } from "@fastify/jwt";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sessionVersion: number;
  organization: {
    id: string;
    name: string;
    status: AccountStatus;
  };
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload:
      | {
          organizationId: string;
          role: UserRole;
          sessionVersion?: number;
          scope?: "broker";
        }
      | {
          scope: "platform-admin";
          sessionVersion: number;
        };
    user: {
      sub: string;
      organizationId: string;
      role: UserRole;
      sessionVersion?: number;
      scope?: "broker";
    };
    namespaces: "broker" | "platformAdmin";
  }
}

declare module "fastify" {
  interface FastifyRequest {
    brokerJwtVerify: JwtVerifyFunction;
    platformAdminJwtVerify: JwtVerifyFunction;
    platformAdmin: { sub: string; scope: "platform-admin"; sessionVersion: number };
  }

  interface FastifyReply {
    brokerJwtSign: JwtSignFunction;
    platformAdminJwtSign: JwtSignFunction;
  }
}
