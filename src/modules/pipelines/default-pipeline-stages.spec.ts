import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client.js";
import { UserRole } from "@/generated/prisma/enums.js";
import { AuthService } from "@/modules/auth/service.js";
import type { PasswordService } from "@/shared/crypto/password.service.js";

import { getDefaultPipelineStages } from "./default-pipeline-stages.js";

describe("default pipeline stages", () => {
  it("creates the six default stages in order", () => {
    const stages = getDefaultPipelineStages();

    expect(stages).toHaveLength(6);
    expect(stages.map((stage) => stage.position)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("marks Fechado as won", () => {
    expect(getDefaultPipelineStages().find((stage) => stage.name === "Fechado")).toMatchObject({
      isWon: true,
      isLost: false,
    });
  });

  it("marks Perdido as lost", () => {
    expect(getDefaultPipelineStages().find((stage) => stage.name === "Perdido")).toMatchObject({
      isWon: false,
      isLost: true,
    });
  });

  it("adds default stages to the organization during registration", async () => {
    const userFindUnique = vi.fn().mockResolvedValue(null);
    const userCreate = vi.fn().mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      name: "Owner",
      email: "owner@example.com",
      role: UserRole.OWNER,
      organization: {
        id: "00000000-0000-4000-8000-000000000002",
        name: "Real Estate",
      },
    });
    const database = {
      user: {
        findUnique: userFindUnique,
        create: userCreate,
      },
    } as unknown as PrismaClient;
    const passwordService = {
      hash: vi.fn().mockResolvedValue("password-hash"),
      compare: vi.fn(),
    } as unknown as PasswordService;
    const authService = new AuthService(database, passwordService);

    await authService.register({
      name: "Owner",
      email: "owner@example.com",
      password: "strong-password",
    });

    const createCall = JSON.stringify(userCreate.mock.calls);
    expect(createCall).toContain('"stages":{"create"');
    expect(createCall).toContain('"name":"Novo lead"');
    expect(createCall).toContain('"name":"Fechado"');
    expect(createCall).toContain('"name":"Perdido"');
  });
});
