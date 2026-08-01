import type { UserRole } from "@/generated/prisma/enums.js";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: {
    id: string;
    name: string;
  };
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      organizationId: string;
      role: UserRole;
    };
    user: {
      sub: string;
      organizationId: string;
      role: UserRole;
    };
  }
}
