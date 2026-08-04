import type { Prisma, PrismaClient } from "@/generated/prisma/client.js";

interface AuditInput {
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}

export class AuditService {
  constructor(private readonly database: PrismaClient) {}

  async log(input: AuditInput): Promise<void> {
    await this.database.auditLog.create({ data: input });
  }
}
