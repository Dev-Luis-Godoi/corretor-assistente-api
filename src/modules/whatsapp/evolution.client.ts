import { env } from "@/config/env.js";
import { AppError } from "@/shared/errors/app-error.js";

interface EvolutionSendResponse { key?: { id?: string }; messageTimestamp?: string | number }

export class EvolutionClient {
  private ensureConfigured() {
    if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY) throw new AppError("Evolution API is not configured", 503, "EVOLUTION_NOT_CONFIGURED");
    return { baseUrl: env.EVOLUTION_API_URL.replace(/\/$/, ""), apiKey: env.EVOLUTION_API_KEY };
  }

  async sendText(instanceName: string, number: string, text: string): Promise<EvolutionSendResponse> {
    const config = this.ensureConfigured();
    const normalizedNumber = number.replace(/\D/g, "");
    if (normalizedNumber.length < 10 || normalizedNumber.length > 15) throw new AppError("Invalid destination number", 400, "INVALID_PHONE_NUMBER");
    const response = await fetch(`${config.baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`, { method: "POST", headers: { apikey: config.apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ number: normalizedNumber, text, linkPreview: false }) });
    if (!response.ok) throw new AppError("WhatsApp provider rejected the message", 502, "EVOLUTION_SEND_FAILED");
    return response.json() as Promise<EvolutionSendResponse>;
  }

  async configureWebhook(instanceName: string, accountId: string) {
    const config = this.ensureConfigured();
    if (!env.PUBLIC_API_URL || !env.EVOLUTION_WEBHOOK_SECRET) throw new AppError("Evolution webhook is not configured", 503, "EVOLUTION_WEBHOOK_NOT_CONFIGURED");
    const response = await fetch(`${config.baseUrl}/webhook/set/${encodeURIComponent(instanceName)}`, { method: "POST", headers: { apikey: config.apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ enabled: true, url: `${env.PUBLIC_API_URL.replace(/\/$/, "")}/webhooks/evolution/${accountId}`, webhookByEvents: false, webhookBase64: false, events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"], headers: { "x-evolution-webhook-secret": env.EVOLUTION_WEBHOOK_SECRET } }) });
    if (!response.ok) throw new AppError("Unable to configure Evolution webhook", 502, "EVOLUTION_WEBHOOK_SETUP_FAILED");
  }
}
