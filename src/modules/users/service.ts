import { Prisma, type PrismaClient } from "@/generated/prisma/client.js";

export class UserService {
  constructor(private readonly database: PrismaClient) {}

  list(organizationId: string, search?: string) {
    return this.database.user.findMany({
      where: { organizationId, OR: search ? [{ name: { contains: search, mode: Prisma.QueryMode.insensitive } }, { email: { contains: search, mode: Prisma.QueryMode.insensitive } }] : undefined },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
  }
}
