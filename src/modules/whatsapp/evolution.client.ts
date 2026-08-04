import { env } from "@/config/env.js";
import { AppError } from "@/shared/errors/app-error.js";

interface EvolutionSendResponse {
  key?: { id?: string };
  messageTimestamp?: string | number;
}

interface EvolutionQrCode {
  base64: string | null;
  pairingCode: string | null;
  count: number | null;
}

interface EvolutionCreateResult {
  instanceId: string | null;
  instanceName: string;
  state: string;
  qrCode: EvolutionQrCode;
}

interface EvolutionConnectionResult {
  state: string;
  connected: boolean;
  phoneNumber: string | null;
}

const requestTimeoutMs = 15_000;
const maxQrCodeLength = 3_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function sanitizeQrCode(value: unknown): EvolutionQrCode {
  const data = isRecord(value) ? value : {};
  const candidate = stringValue(data.base64);
  const base64 =
    candidate &&
    candidate.length <= maxQrCodeLength &&
    /^data:image\/png;base64,[a-z0-9+/=\r\n]+$/i.test(candidate)
      ? candidate
      : null;

  return {
    base64,
    pairingCode: stringValue(data.pairingCode),
    count: typeof data.count === "number" && Number.isFinite(data.count) ? data.count : null,
  };
}

export class EvolutionClient {
  private ensureConfigured() {
    if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY) {
      throw new AppError(
        "Evolution API is not configured",
        503,
        "EVOLUTION_NOT_CONFIGURED",
      );
    }

    return {
      baseUrl: env.EVOLUTION_API_URL.replace(/\/$/, ""),
      apiKey: env.EVOLUTION_API_KEY,
    };
  }

  private async request(path: string, init: RequestInit = {}) {
    const config = this.ensureConfigured();

    try {
      return await fetch(`${config.baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(requestTimeoutMs),
        headers: {
          apikey: config.apiKey,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });
    } catch {
      throw new AppError(
        "WhatsApp provider is unavailable",
        502,
        "EVOLUTION_UNAVAILABLE",
      );
    }
  }

  async createInstance(instanceName: string): Promise<EvolutionCreateResult> {
    const response = await this.request("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    if (!response.ok) {
      throw new AppError(
        "Unable to create WhatsApp instance",
        502,
        "EVOLUTION_INSTANCE_CREATE_FAILED",
      );
    }

    const payload: unknown = await response.json();
    const root = isRecord(payload) ? payload : {};
    const instance = isRecord(root.instance) ? root.instance : {};

    return {
      instanceId: stringValue(instance.instanceId),
      instanceName: stringValue(instance.instanceName) ?? instanceName,
      state: stringValue(instance.status) ?? "connecting",
      qrCode: sanitizeQrCode(root.qrcode),
    };
  }

  async connectInstance(instanceName: string): Promise<EvolutionQrCode> {
    const response = await this.request(
      `/instance/connect/${encodeURIComponent(instanceName)}`,
    );

    if (!response.ok) {
      throw new AppError(
        "Unable to generate WhatsApp QR code",
        502,
        "EVOLUTION_QR_CODE_FAILED",
      );
    }

    return sanitizeQrCode((await response.json()) as unknown);
  }

  async getConnectionState(instanceName: string): Promise<EvolutionConnectionResult> {
    const response = await this.request(
      `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    );

    if (!response.ok) {
      throw new AppError(
        "Unable to check WhatsApp connection",
        502,
        "EVOLUTION_CONNECTION_CHECK_FAILED",
      );
    }

    const payload: unknown = await response.json();
    const root = isRecord(payload) ? payload : {};
    const instance = isRecord(root.instance) ? root.instance : {};
    const state = stringValue(instance.state) ?? stringValue(root.state) ?? "unknown";
    const connected = state.toLowerCase() === "open";
    let phoneNumber: string | null = null;

    if (connected) {
      const detailsResponse = await this.request(
        `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
      );

      if (detailsResponse.ok) {
        const detailsPayload: unknown = await detailsResponse.json();
        const firstInstance: unknown = Array.isArray(detailsPayload)
          ? detailsPayload[0]
          : isRecord(detailsPayload) && Array.isArray(detailsPayload.instances)
            ? detailsPayload.instances[0]
            : detailsPayload;
        const details = isRecord(firstInstance) ? firstInstance : {};
        const ownerJid = stringValue(details.ownerJid) ?? stringValue(details.number);
        const normalizedNumber = ownerJid?.split("@")[0]?.replace(/\D/g, "") ?? "";

        if (normalizedNumber.length >= 10 && normalizedNumber.length <= 15) {
          phoneNumber = normalizedNumber;
        }
      }
    }

    return { state, connected, phoneNumber };
  }

  async deleteInstance(instanceName: string): Promise<void> {
    const response = await this.request(
      `/instance/delete/${encodeURIComponent(instanceName)}`,
      { method: "DELETE" },
    );

    if (!response.ok && response.status !== 404) {
      throw new AppError(
        "Unable to remove WhatsApp instance",
        502,
        "EVOLUTION_INSTANCE_DELETE_FAILED",
      );
    }
  }

  async sendText(
    instanceName: string,
    number: string,
    text: string,
  ): Promise<EvolutionSendResponse> {
    const normalizedNumber = number.replace(/\D/g, "");

    if (normalizedNumber.length < 10 || normalizedNumber.length > 15) {
      throw new AppError("Invalid destination number", 400, "INVALID_PHONE_NUMBER");
    }

    const response = await this.request(
      `/message/sendText/${encodeURIComponent(instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({ number: normalizedNumber, text, linkPreview: false }),
      },
    );

    if (!response.ok) {
      throw new AppError(
        "WhatsApp provider rejected the message",
        502,
        "EVOLUTION_SEND_FAILED",
      );
    }

    return response.json() as Promise<EvolutionSendResponse>;
  }

  async sendMedia(instanceName: string, number: string, input: { mediaType: "image" | "audio" | "document"; mimeType: string; fileName: string; base64: string; caption?: string }): Promise<EvolutionSendResponse> {
    const normalizedNumber = number.replace(/\D/g, "");
    if (normalizedNumber.length < 10 || normalizedNumber.length > 15) throw new AppError("Invalid destination number", 400, "INVALID_PHONE_NUMBER");
    const response = await this.request(`/message/sendMedia/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      body: JSON.stringify({ number: normalizedNumber, mediatype: input.mediaType, mimetype: input.mimeType, media: input.base64, fileName: input.fileName, caption: input.caption ?? "" }),
    });
    if (!response.ok) throw new AppError("WhatsApp provider rejected the attachment", 502, "EVOLUTION_MEDIA_SEND_FAILED");
    return response.json() as Promise<EvolutionSendResponse>;
  }

  async configureWebhook(instanceName: string, accountId: string) {
    if (!env.PUBLIC_API_URL || !env.EVOLUTION_WEBHOOK_SECRET) {
      throw new AppError(
        "Evolution webhook is not configured",
        503,
        "EVOLUTION_WEBHOOK_NOT_CONFIGURED",
      );
    }

    const response = await this.request(
      `/webhook/set/${encodeURIComponent(instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: `${env.PUBLIC_API_URL.replace(/\/$/, "")}/webhooks/evolution/${accountId}`,
            webhookByEvents: false,
            webhookBase64: false,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
            headers: { "x-evolution-webhook-secret": env.EVOLUTION_WEBHOOK_SECRET },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new AppError(
        "Unable to configure Evolution webhook",
        502,
        "EVOLUTION_WEBHOOK_SETUP_FAILED",
      );
    }
  }
}
