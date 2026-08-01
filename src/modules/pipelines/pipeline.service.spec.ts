import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Prisma, PrismaClient } from "@/generated/prisma/client.js";

import { PipelineService } from "./pipeline.service.js";

const pipelineStageFindFirst = vi.fn();
const pipelineStageFindMany = vi.fn();
const pipelineStageCreate = vi.fn();
const pipelineStageUpdate = vi.fn();
const pipelineStageDelete = vi.fn();

const transactionClient = {
  pipelineStage: {
    findFirst: pipelineStageFindFirst,
    findMany: pipelineStageFindMany,
    create: pipelineStageCreate,
    update: pipelineStageUpdate,
    delete: pipelineStageDelete,
  },
} as unknown as Prisma.TransactionClient;

type TransactionCallback = (transaction: Prisma.TransactionClient) => Promise<unknown>;

const transaction = vi.fn(async (callback: TransactionCallback) => callback(transactionClient));

const database = {
  pipelineStage: transactionClient.pipelineStage,
  $transaction: transaction,
} as unknown as PrismaClient;

const organizationId = "00000000-0000-4000-8000-000000000001";
const firstStageId = "00000000-0000-4000-8000-000000000002";
const secondStageId = "00000000-0000-4000-8000-000000000003";
const thirdStageId = "00000000-0000-4000-8000-000000000004";

function stage(id: string, position: number) {
  return {
    id,
    name: `Stage ${position}`,
    position,
    color: null,
    isWon: false,
    isLost: false,
  };
}

describe("PipelineService", () => {
  const pipelineService = new PipelineService(database);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists only stages from the authenticated organization", async () => {
    pipelineStageFindMany.mockResolvedValue([stage(firstStageId, 0)]);

    const stages = await pipelineService.listStages(organizationId);

    expect(stages).toHaveLength(1);
    expect(JSON.stringify(pipelineStageFindMany.mock.calls)).toContain(organizationId);
    expect(JSON.stringify(pipelineStageFindMany.mock.calls)).toContain('"position":"asc"');
  });

  it("creates a stage at the last position", async () => {
    pipelineStageFindFirst.mockResolvedValue({ position: 2 });
    pipelineStageCreate.mockResolvedValue(stage(thirdStageId, 3));

    const createdStage = await pipelineService.createStage(organizationId, {
      name: "Proposal",
      color: "#8B5CF6",
    });

    expect(createdStage.position).toBe(3);
    expect(JSON.stringify(pipelineStageCreate.mock.calls)).toContain('"position":3');
    expect(JSON.stringify(pipelineStageCreate.mock.calls)).toContain(organizationId);
  });

  it("does not update a stage from another organization", async () => {
    pipelineStageFindFirst.mockResolvedValue(null);

    await expect(
      pipelineService.updateStage(organizationId, firstStageId, { name: "Updated" }),
    ).rejects.toMatchObject({ code: "PIPELINE_STAGE_NOT_FOUND" });

    expect(pipelineStageUpdate).not.toHaveBeenCalled();
  });

  it("reorders stages using temporary and final positions", async () => {
    pipelineStageFindMany
      .mockResolvedValueOnce([
        { id: firstStageId, position: 0 },
        { id: secondStageId, position: 1 },
        { id: thirdStageId, position: 2 },
      ])
      .mockResolvedValueOnce([
        stage(thirdStageId, 0),
        stage(firstStageId, 1),
        stage(secondStageId, 2),
      ]);
    pipelineStageUpdate.mockResolvedValue(stage(firstStageId, 0));

    const stages = await pipelineService.reorderStages(organizationId, [
      thirdStageId,
      firstStageId,
      secondStageId,
    ]);

    expect(pipelineStageUpdate).toHaveBeenCalledTimes(6);
    expect(pipelineStageUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: thirdStageId },
      data: { position: 6 },
    });
    expect(pipelineStageUpdate).toHaveBeenNthCalledWith(4, {
      where: { id: thirdStageId },
      data: { position: 0 },
    });
    expect(stages.map((currentStage) => currentStage.id)).toEqual([
      thirdStageId,
      firstStageId,
      secondStageId,
    ]);
  });

  it("rejects reorderings without all current stages", async () => {
    pipelineStageFindMany.mockResolvedValue([
      { id: firstStageId, position: 0 },
      { id: secondStageId, position: 1 },
    ]);

    await expect(
      pipelineService.reorderStages(organizationId, [firstStageId]),
    ).rejects.toMatchObject({ code: "INVALID_PIPELINE_STAGE_ORDER" });

    expect(pipelineStageUpdate).not.toHaveBeenCalled();
  });

  it("does not delete a stage that has leads", async () => {
    pipelineStageFindMany.mockResolvedValue([
      { id: firstStageId, position: 0, _count: { leads: 1 } },
      { id: secondStageId, position: 1, _count: { leads: 0 } },
    ]);

    await expect(pipelineService.deleteStage(organizationId, firstStageId)).rejects.toMatchObject({
      code: "PIPELINE_STAGE_HAS_LEADS",
    });

    expect(pipelineStageDelete).not.toHaveBeenCalled();
  });

  it("does not delete the last available stage", async () => {
    pipelineStageFindMany.mockResolvedValue([
      { id: firstStageId, position: 0, _count: { leads: 0 } },
    ]);

    await expect(pipelineService.deleteStage(organizationId, firstStageId)).rejects.toMatchObject({
      code: "CANNOT_DELETE_LAST_PIPELINE_STAGE",
    });

    expect(pipelineStageDelete).not.toHaveBeenCalled();
  });

  it("compacts remaining positions after deletion", async () => {
    pipelineStageFindMany.mockResolvedValue([
      { id: firstStageId, position: 0, _count: { leads: 0 } },
      { id: secondStageId, position: 1, _count: { leads: 0 } },
      { id: thirdStageId, position: 2, _count: { leads: 0 } },
    ]);
    pipelineStageDelete.mockResolvedValue(stage(secondStageId, 1));
    pipelineStageUpdate.mockResolvedValue(stage(firstStageId, 0));

    await pipelineService.deleteStage(organizationId, secondStageId);

    expect(pipelineStageDelete).toHaveBeenCalledWith({ where: { id: secondStageId } });
    expect(pipelineStageUpdate).toHaveBeenCalledTimes(4);
    expect(pipelineStageUpdate).toHaveBeenNthCalledWith(3, {
      where: { id: firstStageId },
      data: { position: 0 },
    });
    expect(pipelineStageUpdate).toHaveBeenNthCalledWith(4, {
      where: { id: thirdStageId },
      data: { position: 1 },
    });
  });
});
