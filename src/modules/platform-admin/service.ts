import { AccountStatus, Prisma, type PrismaClient } from "@/generated/prisma/client.js";
import type { PasswordService } from "@/shared/crypto/password.service.js";
import { AppError } from "@/shared/errors/app-error.js";
import type { PlatformAccountsQuery, PlatformAdminLoginInput } from "./schemas.js";

const adminSelect = {
  id: true,
  name: true,
  email: true,
  active: true,
  sessionVersion: true,
  lastLoginAt: true,
} satisfies Prisma.PlatformAdminSelect;

const accountSelect = {
  id: true,
  name: true,
  status: true,
  trialEndsAt: true,
  suspendedAt: true,
  createdAt: true,
  updatedAt: true,
  users: {
    orderBy: { createdAt: "asc" as const },
    take: 1,
    select: { id: true, name: true, email: true, lastLoginAt: true },
  },
  whatsappAccounts: {
    select: { id: true, name: true, phoneNumber: true, isConnected: true },
  },
  _count: { select: { leads: true, contacts: true, conversations: true, tasks: true } },
} satisfies Prisma.OrganizationSelect;

export class PlatformAdminService {
  constructor(
    private readonly database: PrismaClient,
    private readonly passwordService: PasswordService,
  ) {}

  async login(input: PlatformAdminLoginInput) {
    const admin = await this.database.platformAdmin.findUnique({
      where: { email: input.email },
      select: { ...adminSelect, passwordHash: true },
    });
    if (
      !admin ||
      !admin.active ||
      !(await this.passwordService.compare(input.password, admin.passwordHash))
    ) {
      throw new AppError("Invalid email or password", 401, "INVALID_ADMIN_CREDENTIALS");
    }
    const updated = await this.database.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
      select: adminSelect,
    });
    await this.database.platformAuditLog.create({
      data: { adminId: admin.id, action: "PLATFORM_ADMIN_LOGIN" },
    });
    return updated;
  }

  async me(adminId: string) {
    const admin = await this.database.platformAdmin.findUnique({
      where: { id: adminId },
      select: adminSelect,
    });
    if (!admin?.active)
      throw new AppError("Administrator not found", 401, "PLATFORM_ADMIN_UNAUTHORIZED");
    return admin;
  }

  async overview() {
    const [statusGroups, brokers, leads, conversations, connectedWhatsapp, recentActivity] =
      await Promise.all([
        this.database.organization.groupBy({ by: ["status"], _count: { _all: true } }),
        this.database.user.count(),
        this.database.lead.count(),
        this.database.conversation.count(),
        this.database.whatsappAccount.count({ where: { isConnected: true } }),
        this.database.platformAuditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            action: true,
            createdAt: true,
            admin: { select: { name: true } },
            targetOrganization: { select: { name: true } },
          },
        }),
      ]);
    const accounts = Object.fromEntries(
      Object.values(AccountStatus).map((status) => [
        status.toLowerCase(),
        statusGroups.find((item) => item.status === status)?._count._all ?? 0,
      ]),
    );
    return {
      accounts: {
        total: statusGroups.reduce((total, item) => total + item._count._all, 0),
        ...accounts,
      },
      brokers,
      leads,
      conversations,
      connectedWhatsapp,
      recentActivity,
    };
  }

  async listAccounts(query: PlatformAccountsQuery) {
    const where: Prisma.OrganizationWhereInput = {
      status: query.status,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            {
              users: {
                some: {
                  OR: [
                    { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                    { email: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                  ],
                },
              },
            },
          ]
        : undefined,
    };
    const [items, total] = await Promise.all([
      this.database.organization.findMany({
        where,
        select: accountSelect,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.organization.count({ where }),
    ]);
    return {
      data: items.map(({ users, ...account }) => ({ ...account, broker: users[0] ?? null })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async updateStatus(adminId: string, organizationId: string, status: AccountStatus) {
    const current = await this.database.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, status: true },
    });
    if (!current) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
    await this.database.$transaction(async (transaction) => {
      await transaction.organization.update({
        where: { id: organizationId },
        data: { status, suspendedAt: status === AccountStatus.SUSPENDED ? new Date() : null },
      });
      await transaction.user.updateMany({
        where: { organizationId },
        data: { sessionVersion: { increment: 1 } },
      });
      await transaction.platformAuditLog.create({
        data: {
          adminId,
          action: "ACCOUNT_STATUS_UPDATED",
          targetOrganizationId: organizationId,
          metadata: { from: current.status, to: status },
        },
      });
    });
    return this.getAccount(organizationId);
  }

  async revokeSessions(adminId: string, organizationId: string) {
    const account = await this.database.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!account) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
    await this.database.$transaction([
      this.database.user.updateMany({
        where: { organizationId },
        data: { sessionVersion: { increment: 1 } },
      }),
      this.database.platformAuditLog.create({
        data: { adminId, action: "ACCOUNT_SESSIONS_REVOKED", targetOrganizationId: organizationId },
      }),
    ]);
  }

  private async getAccount(organizationId: string) {
    const result = await this.database.organization.findUnique({
      where: { id: organizationId },
      select: accountSelect,
    });
    if (!result) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
    const { users, ...account } = result;
    return { ...account, broker: users[0] ?? null };
  }
}
