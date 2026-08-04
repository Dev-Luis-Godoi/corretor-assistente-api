import type { PrismaClient } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";
import type { UpdateOrganizationInput } from "./schemas.js";
import type { AuditService } from "@/shared/audit/audit.service.js";

const organizationSelect = {
  id: true,
  name: true,
  createdAt: true,
  _count: { select: { users: true } },
} as const;

export class OrganizationService {
  constructor(private readonly database: PrismaClient,private readonly audit?:AuditService) {}

  async get(organizationId: string) {
    const organization = await this.database.organization.findUnique({
      where: { id: organizationId },
      select: organizationSelect,
    });
    if (!organization) throw new AppError("Organization not found", 404, "ORGANIZATION_NOT_FOUND");
    return organization;
  }

  async update(organizationId: string,userId:string, input: UpdateOrganizationInput) {
    const organization=await this.database.organization.update({
      where: { id: organizationId },
      data: input,
      select: organizationSelect,
    });
    await this.audit?.log({organizationId,userId,action:"ORGANIZATION_UPDATED",entityType:"Organization",entityId:organizationId,metadata:{name:input.name}});
    return organization;
  }
}
