import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client.js";

import { LeadService } from "./service.js";

const contactFindFirst = vi.fn();
const stageFindFirst = vi.fn();
const userFindFirst = vi.fn();
const leadFindFirst = vi.fn();
const leadFindMany = vi.fn();
const leadCount = vi.fn();
const leadCreate = vi.fn();
const leadUpdate = vi.fn();
const transaction = vi.fn();

const database = {
  contact: { findFirst: contactFindFirst },
  pipelineStage: { findFirst: stageFindFirst },
  user: { findFirst: userFindFirst },
  lead: {
    findFirst: leadFindFirst,
    findMany: leadFindMany,
    count: leadCount,
    create: leadCreate,
    update: leadUpdate,
  },
  $transaction: transaction,
} as unknown as PrismaClient;

const organizationId = "00000000-0000-4000-8000-000000000001";
const contactId = "00000000-0000-4000-8000-000000000002";
const stageId = "00000000-0000-4000-8000-000000000003";

describe("LeadService tenant isolation", () => {
  const leadService = new LeadService(database);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes related records to the authenticated organization", async () => {
    contactFindFirst.mockResolvedValue(null);
    stageFindFirst.mockResolvedValue({ id: stageId });

    await expect(
      leadService.create(organizationId, {
        title: "Apartment",
        contactId,
        stageId,
      }),
    ).rejects.toMatchObject({ code: "CONTACT_NOT_FOUND" });

    expect(contactFindFirst).toHaveBeenCalledWith({
      where: { id: contactId, organizationId },
      select: { id: true },
    });
    expect(stageFindFirst).toHaveBeenCalledWith({
      where: { id: stageId, organizationId },
      select: { id: true },
    });
  });

  it("lists only leads from the authenticated organization", async () => {
    leadFindMany.mockReturnValue(Promise.resolve([]));
    leadCount.mockReturnValue(Promise.resolve(0));
    transaction.mockResolvedValue([[], 0]);

    const result = await leadService.list(organizationId, {
      page: 1,
      limit: 20,
    });

    expect(leadFindMany).toHaveBeenCalledOnce();
    expect(JSON.stringify(leadFindMany.mock.calls)).toContain(organizationId);
    expect(result.meta.total).toBe(0);
  });

  it("does not update a lead outside the authenticated organization", async () => {
    leadFindFirst.mockResolvedValue(null);
    stageFindFirst.mockResolvedValue({ id: stageId });

    await expect(
      leadService.updateStage(organizationId, contactId, { stageId }),
    ).rejects.toMatchObject({ code: "LEAD_NOT_FOUND" });

    expect(leadFindFirst).toHaveBeenCalledWith({
      where: { id: contactId, organizationId },
      select: { id: true, stageId: true },
    });
    expect(leadUpdate).not.toHaveBeenCalled();
  });
});
