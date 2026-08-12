import { afterAll, describe, expect, it } from "vitest";

import { buildApp } from "@/app.js";
import { UserRole } from "@/generated/prisma/enums.js";

const app = buildApp();

app.get("/test-internal-error", () => {
  throw new Error("database connection and filesystem details");
});

afterAll(async () => {
  await app.close();
});

async function authenticatedCookie(role: UserRole = UserRole.OWNER) {
  await app.ready();

  const token = app.jwt.broker.sign(
    {
      organizationId: "00000000-0000-4000-8000-000000000001",
      role,
    },
    {
      sub: "00000000-0000-4000-8000-000000000002",
    },
  );

  return `accessToken=${token}`;
}

describe("application infrastructure", () => {
  it("reports its health", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok" });
  });

  it("does not expose public account registration", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "A",
        email: "invalid-email",
        password: "short",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("validates login input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "invalid-email",
        password: "",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("protects the current user endpoint", async () => {
    const response = await app.inject({ method: "GET", url: "/auth/me" });

    expect(response.statusCode).toBe(401);
  });

  it("protects the platform administration overview", async () => {
    const response = await app.inject({ method: "GET", url: "/platform-admin/overview" });
    expect(response.statusCode).toBe(401);
  });

  it("validates the platform administrator login", async () => {
    const response = await app.inject({ method: "POST", url: "/platform-admin/auth/login", payload: { email: "invalid", password: "" } });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("does not accept a broker cookie in the platform administration", async () => {
    const response = await app.inject({ method: "GET", url: "/platform-admin/overview", headers: { cookie: await authenticatedCookie() } });
    expect(response.statusCode).toBe(401);
  });

  it("protects platform account creation", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/platform-admin/accounts",
      payload: { name: "Novo Corretor", email: "corretor@example.com" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("clears the authentication cookie on logout", async () => {
    const response = await app.inject({ method: "POST", url: "/auth/logout" });

    expect(response.statusCode).toBe(204);
    expect(response.headers["set-cookie"]).toContain("accessToken=;");
  });

  it("protects the dashboard summary endpoint", async () => {
    const response = await app.inject({ method: "GET", url: "/dashboard/summary" });
    expect(response.statusCode).toBe(401);
  });

  it("validates password reset input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { token: "short", password: "short" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("does not expose internal error details", async () => {
    const response = await app.inject({ method: "GET", url: "/test-internal-error" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    });
  });

  it("protects lead endpoints", async () => {
    const response = await app.inject({ method: "GET", url: "/leads" });

    expect(response.statusCode).toBe(401);
  });

  it("validates lead creation input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/leads",
      headers: { cookie: await authenticatedCookie() },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("validates lead listing filters", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/leads?page=0",
      headers: { cookie: await authenticatedCookie() },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("validates lead stage update input", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/leads/not-a-uuid/stage",
      headers: { cookie: await authenticatedCookie() },
      payload: {
        stageId: "00000000-0000-4000-8000-000000000003",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("protects WhatsApp conversation endpoints", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/whatsapp/conversations",
    });

    expect(response.statusCode).toBe(401);
  });

  it("validates conversation listing filters", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/whatsapp/conversations?page=0",
      headers: { cookie: await authenticatedCookie() },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("validates conversation identifiers", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/whatsapp/conversations/not-a-uuid",
      headers: { cookie: await authenticatedCookie() },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("validates conversation identifiers when marking messages as read", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/whatsapp/conversations/not-a-uuid/read",
      headers: { cookie: await authenticatedCookie() },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("validates message listing filters", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/whatsapp/conversations/00000000-0000-4000-8000-000000000003/messages?limit=0",
      headers: { cookie: await authenticatedCookie() },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("validates conversation identifier when sending a message", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/conversations/not-a-uuid/messages",
      headers: { cookie: await authenticatedCookie() },
      payload: { content: "Olá" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("protects Evolution webhook configuration", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/accounts/00000000-0000-4000-8000-000000000001/configure-evolution",
    });
    expect(response.statusCode).toBe(401);
  });

  it("protects WhatsApp account endpoints", async () => {
    const response = await app.inject({ method: "GET", url: "/whatsapp/accounts" });
    expect(response.statusCode).toBe(401);
  });

  it("validates WhatsApp account creation", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/accounts",
      headers: { cookie: await authenticatedCookie() },
      payload: { name: "A", instanceName: "injected-instance" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("validates WhatsApp account identifiers", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/whatsapp/accounts/not-a-uuid/connect",
      headers: { cookie: await authenticatedCookie() },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("validates WhatsApp account identifiers when disconnecting", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/whatsapp/accounts/not-a-uuid/connection",
      headers: { cookie: await authenticatedCookie() },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("prevents agents from managing WhatsApp accounts", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/whatsapp/accounts",
      headers: { cookie: await authenticatedCookie(UserRole.AGENT) },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ error: "WHATSAPP_ACCOUNT_FORBIDDEN" });
  });

  it("allows administrators to reach WhatsApp account validation", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/whatsapp/accounts",
      headers: { cookie: await authenticatedCookie(UserRole.ADMIN) },
      payload: { name: "A" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("protects pipeline endpoints", async () => {
    const response = await app.inject({ method: "GET", url: "/pipeline/stages" });

    expect(response.statusCode).toBe(401);
  });

  it("validates pipeline stage creation", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/pipeline/stages",
      headers: { cookie: await authenticatedCookie() },
      payload: { name: "A", color: "blue" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("validates duplicate pipeline stage IDs when reordering", async () => {
    const stageId = "00000000-0000-4000-8000-000000000003";
    const response = await app.inject({
      method: "PATCH",
      url: "/pipeline/stages/reorder",
      headers: { cookie: await authenticatedCookie() },
      payload: { stageIds: [stageId, stageId] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("protects contact endpoints", async () => {
    const response = await app.inject({ method: "GET", url: "/contacts" });

    expect(response.statusCode).toBe(401);
  });

  it("validates contact creation", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/contacts",
      headers: { cookie: await authenticatedCookie() },
      payload: {
        phone: "invalid-phone",
        organizationId: "00000000-0000-4000-8000-000000000099",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("protects task endpoints", async () => {
    const response = await app.inject({ method: "GET", url: "/tasks" });
    expect(response.statusCode).toBe(401);
  });

  it("protects property endpoints", async () => {
    const response = await app.inject({ method: "GET", url: "/properties" });
    expect(response.statusCode).toBe(401);
  });

  it("validates property creation", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/properties",
      headers: { cookie: await authenticatedCookie() },
      payload: { title: "A", price: -1, city: "X", state: "São Paulo" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("validates property photo upload identifiers", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/properties/not-a-uuid/photos/upload-url",
      headers: { cookie: await authenticatedCookie() },
      payload: { fileName: "fachada.webp", mimeType: "image/webp", sizeBytes: 1024 },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("validates task creation", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/tasks",
      headers: { cookie: await authenticatedCookie() },
      payload: { title: "x", dueAt: "invalid" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("protects automation endpoints", async () => {
    const response = await app.inject({ method: "GET", url: "/automations/rules" });
    expect(response.statusCode).toBe(401);
  });

  it("validates message templates", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/automations/templates",
      headers: { cookie: await authenticatedCookie() },
      payload: { name: "x", content: "" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("validates conversation conversion identifiers", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/leads/from-conversation/not-a-uuid",
      headers: { cookie: await authenticatedCookie() },
      payload: {},
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "VALIDATION_ERROR" });
  });

  it("does not expose CORS credentials to an untrusted origin", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://malicious.example" },
    });

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
