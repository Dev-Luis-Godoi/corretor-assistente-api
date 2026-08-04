import { afterEach, describe, expect, it, vi } from "vitest";

import { env } from "@/config/env.js";

import { EvolutionClient } from "./evolution.client.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EvolutionClient", () => {
  it("configures a protected webhook using the Evolution v2 payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await new EvolutionClient().configureWebhook(
      "main instance",
      "00000000-0000-4000-8000-000000000001",
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `${env.EVOLUTION_API_URL!.replace(/\/$/, "")}/webhook/set/main%20instance`,
    );
    expect(typeof init.body).toBe("string");
    if (typeof init.body !== "string") throw new Error("Expected a JSON request body");
    expect(JSON.parse(init.body)).toEqual({
      webhook: {
        enabled: true,
        url: `${env.PUBLIC_API_URL!.replace(/\/$/, "")}/webhooks/evolution/00000000-0000-4000-8000-000000000001`,
        webhookByEvents: false,
        webhookBase64: false,
        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
        headers: { "x-evolution-webhook-secret": env.EVOLUTION_WEBHOOK_SECRET },
      },
    });
  });

  it("does not forward an unsafe QR code data URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        instance: { instanceName: "main", status: "connecting" },
        qrcode: { base64: "data:image/svg+xml;base64,PHN2Zz4=" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new EvolutionClient().createInstance("main");

    expect(result.qrCode.base64).toBeNull();
  });

  it("returns only the normalized phone number for a connected instance", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ instance: { state: "open" } }))
      .mockResolvedValueOnce(
        Response.json([{ ownerJid: "5511999999999@s.whatsapp.net", profileName: "Private" }]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new EvolutionClient().getConnectionState("main");

    expect(result).toEqual({
      state: "open",
      connected: true,
      phoneNumber: "5511999999999",
    });
  });

  it("logs out an instance without deleting it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await new EvolutionClient().logoutInstance("main instance");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `${env.EVOLUTION_API_URL!.replace(/\/$/, "")}/instance/logout/main%20instance`,
    );
    expect(init.method).toBe("DELETE");
  });

  it("treats an already disconnected instance as an idempotent success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 400 })),
    );

    await expect(new EvolutionClient().logoutInstance("main")).resolves.toBeUndefined();
  });
});
