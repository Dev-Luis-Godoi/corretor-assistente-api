import type { PrismaClient } from "@/generated/prisma/client.js";
import { Prisma } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";
import type {
  CreateRelationshipInput,
  ListRelationshipsQuery,
  UpdateRelationshipInput,
} from "./relationship.schemas.js";
export class RelationshipService {
  constructor(private readonly database: PrismaClient) {}
  async listOwners(organizationId: string, query: ListRelationshipsQuery) {
    const where = {
      organizationId,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { phone: { contains: query.search } },
            { email: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
          ]
        : undefined,
    } satisfies Prisma.OwnerWhereInput;
    const select = {
      id: true,
      name: true,
      phone: true,
      email: true,
      document: true,
      notes: true,
      properties: { select: {
        id: true,
        title: true,
        reference: true,
        authorizationStatus: true,
        authorizationDate: true,
        exclusive: true,
        exclusivityEndAt: true,
        authorizationDocumentName: true,
      } },
      _count: { select: { properties: true } },
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.OwnerSelect;
    const [data, total] = await this.database.$transaction([
      this.database.owner.findMany({
        where,
        select,
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.owner.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async listClients(organizationId: string, query: ListRelationshipsQuery) {
    const where = {
      organizationId,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { phone: { contains: query.search } },
            { email: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
          ]
        : undefined,
    } satisfies Prisma.ClientWhereInput;
    const [data, total] = await this.database.$transaction([
      this.database.client.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.client.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  createOwner(organizationId: string, input: CreateRelationshipInput) {
    return this.database.owner.create({ data: { ...input, organizationId } });
  }
  createClient(organizationId: string, input: CreateRelationshipInput) {
    return this.database.client.create({ data: { ...input, organizationId, origin: "MANUAL" } });
  }
  async updateOwner(organizationId: string, id: string, input: UpdateRelationshipInput) {
    await this.requireOwner(organizationId, id);
    return this.database.owner.update({ where: { id }, data: input });
  }
  async updateClient(organizationId: string, id: string, input: UpdateRelationshipInput) {
    await this.requireClient(organizationId, id);
    return this.database.client.update({ where: { id }, data: input });
  }
  async deleteOwner(organizationId: string, id: string) {
    await this.requireOwner(organizationId, id);
    await this.database.owner.delete({ where: { id } });
  }
  async deleteClient(organizationId: string, id: string) {
    await this.requireClient(organizationId, id);
    await this.database.client.delete({ where: { id } });
  }
  private async requireOwner(organizationId: string, id: string) {
    if (
      !(await this.database.owner.findFirst({
        where: { id, organizationId },
        select: { id: true },
      }))
    )
      throw new AppError("Owner not found", 404, "OWNER_NOT_FOUND");
  }
  private async requireClient(organizationId: string, id: string) {
    if (
      !(await this.database.client.findFirst({
        where: { id, organizationId },
        select: { id: true },
      }))
    )
      throw new AppError("Client not found", 404, "CLIENT_NOT_FOUND");
  }
}
