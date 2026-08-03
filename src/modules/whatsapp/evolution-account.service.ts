import type { PrismaClient } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";
import { EvolutionClient } from "./evolution.client.js";

export class EvolutionAccountService {
  constructor(private readonly database: PrismaClient, private readonly evolutionClient = new EvolutionClient()) {}
  async configureWebhook(organizationId: string, accountId: string) {
    const account = await this.database.whatsappAccount.findFirst({ where: { id: accountId, organizationId }, select: { id: true, instanceName: true } });
    if (!account) throw new AppError("WhatsApp account not found", 404, "WHATSAPP_ACCOUNT_NOT_FOUND");
    if (!account.instanceName) throw new AppError("Evolution instance is not configured", 409, "EVOLUTION_INSTANCE_NOT_CONFIGURED");
    await this.evolutionClient.configureWebhook(account.instanceName, account.id);
  }
}
