import type { PrismaClient } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";
import type { UpdateOrganizationInput } from "./schemas.js";

const organizationSelect = {
  id: true,
  name: true,
  createdAt: true,
  _count: { select: { users: true } },
} as const;

export class OrganizationService {
  constructor(private readonly database: PrismaClient) {}

  async get(organizationId: string) {
    const organization = await this.database.organization.findUnique({
      where: { id: organizationId },
      select: organizationSelect,
    });
    if (!organization) throw new AppError("Organization not found", 404, "ORGANIZATION_NOT_FOUND");
    return organization;
  }

  update(organizationId: string, input: UpdateOrganizationInput) {
    return this.database.organization.update({
      where: { id: organizationId },
      data: input,
      select: organizationSelect,
    });
  }
}
