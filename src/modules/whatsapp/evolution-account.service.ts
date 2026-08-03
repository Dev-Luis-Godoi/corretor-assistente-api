import type { Prisma, PrismaClient } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";

import type { CreateEvolutionAccountInput } from "./evolution.schemas.js";
import { EvolutionClient } from "./evolution.client.js";

const accountSelect = {
  id: true,
  name: true,
  phoneNumber: true,
  instanceName: true,
  isConnected: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WhatsappAccountSelect;

export class EvolutionAccountService {
  constructor(
    private readonly database: PrismaClient,
    private readonly evolutionClient = new EvolutionClient(),
  ) {}

  async list(organizationId: string) {
    return this.database.whatsappAccount.findMany({
      where: { organizationId },
      select: accountSelect,
      orderBy: { createdAt: "asc" },
    });
  }

  async create(organizationId: string, input: CreateEvolutionAccountInput) {
    const account = await this.database.whatsappAccount.create({
      data: {
        organizationId,
        name: input.name,
        phoneNumber: null,
      },
      select: accountSelect,
    });
    const instanceName = `corretor-${account.id}`;
    let providerInstanceCreated = false;

    try {
      const result = await this.evolutionClient.createInstance(instanceName);
      providerInstanceCreated = true;

      const updatedAccount = await this.database.whatsappAccount.update({
        where: { id: account.id },
        data: {
          instanceName: result.instanceName,
          externalId: result.instanceId,
          isConnected: result.state.toLowerCase() === "open",
        },
        select: accountSelect,
      });

      await this.evolutionClient.configureWebhook(result.instanceName, account.id);

      return { account: updatedAccount, qrCode: result.qrCode };
    } catch (error) {
      if (providerInstanceCreated) {
        await this.evolutionClient.deleteInstance(instanceName).catch(() => undefined);
      }
      await this.database.whatsappAccount.delete({ where: { id: account.id } }).catch(() => undefined);
      throw error;
    }
  }

  async connect(organizationId: string, accountId: string) {
    const account = await this.getConfiguredAccount(organizationId, accountId);
    const qrCode = await this.evolutionClient.connectInstance(account.instanceName);

    return { accountId: account.id, qrCode };
  }

  async getStatus(organizationId: string, accountId: string) {
    const account = await this.getConfiguredAccount(organizationId, accountId);
    const status = await this.evolutionClient.getConnectionState(account.instanceName);

    if (status.connected !== account.isConnected || status.phoneNumber) {
      await this.database.whatsappAccount.update({
        where: { id: account.id },
        data: {
          isConnected: status.connected,
          ...(status.phoneNumber ? { phoneNumber: status.phoneNumber } : {}),
        },
      });
    }

    return { accountId: account.id, ...status };
  }

  async configureWebhook(organizationId: string, accountId: string) {
    const account = await this.getConfiguredAccount(organizationId, accountId);
    await this.evolutionClient.configureWebhook(account.instanceName, account.id);
  }

  private async getConfiguredAccount(organizationId: string, accountId: string) {
    const account = await this.database.whatsappAccount.findFirst({
      where: { id: accountId, organizationId },
      select: { id: true, instanceName: true, isConnected: true },
    });

    if (!account) {
      throw new AppError(
        "WhatsApp account not found",
        404,
        "WHATSAPP_ACCOUNT_NOT_FOUND",
      );
    }
    if (!account.instanceName) {
      throw new AppError(
        "Evolution instance is not configured",
        409,
        "EVOLUTION_INSTANCE_NOT_CONFIGURED",
      );
    }

    return { ...account, instanceName: account.instanceName };
  }
}
