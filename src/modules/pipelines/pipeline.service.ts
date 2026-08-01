import type { PrismaClient } from "@/generated/prisma/client.js";
import type { Prisma } from "@/generated/prisma/client.js";

import {
  CannotDeleteLastPipelineStageError,
  InvalidPipelineStageOrderError,
  PipelineStageHasLeadsError,
  PipelineStageNotFoundError,
} from "./pipeline.errors.js";
import type { CreatePipelineStageInput, UpdatePipelineStageInput } from "./pipeline.types.js";

const pipelineStageSelect = {
  id: true,
  name: true,
  position: true,
  color: true,
  isWon: true,
  isLost: true,
} satisfies Prisma.PipelineStageSelect;

type PipelineStageView = Prisma.PipelineStageGetPayload<{ select: typeof pipelineStageSelect }>;

interface StagePosition {
  id: string;
  position: number;
}

async function applyStagePositions(
  transaction: Prisma.TransactionClient,
  stages: StagePosition[],
  orderedStageIds: string[],
) {
  const highestPosition = stages.reduce((highest, stage) => Math.max(highest, stage.position), 0);
  const temporaryPositionStart = highestPosition + orderedStageIds.length + 1;

  for (const [index, stageId] of orderedStageIds.entries()) {
    await transaction.pipelineStage.update({
      where: { id: stageId },
      data: { position: temporaryPositionStart + index },
    });
  }

  for (const [position, stageId] of orderedStageIds.entries()) {
    await transaction.pipelineStage.update({
      where: { id: stageId },
      data: { position },
    });
  }
}

export class PipelineService {
  constructor(private readonly database: PrismaClient) {}

  async listStages(organizationId: string): Promise<PipelineStageView[]> {
    return this.database.pipelineStage.findMany({
      where: { organizationId },
      select: pipelineStageSelect,
      orderBy: { position: "asc" },
    });
  }

  async createStage(
    organizationId: string,
    input: CreatePipelineStageInput,
  ): Promise<PipelineStageView> {
    return this.database.$transaction(async (transaction) => {
      const lastStage = await transaction.pipelineStage.findFirst({
        where: { organizationId },
        select: { position: true },
        orderBy: { position: "desc" },
      });

      return transaction.pipelineStage.create({
        data: {
          name: input.name,
          color: input.color,
          position: (lastStage?.position ?? -1) + 1,
          organizationId,
        },
        select: pipelineStageSelect,
      });
    });
  }

  async updateStage(
    organizationId: string,
    stageId: string,
    input: UpdatePipelineStageInput,
  ): Promise<PipelineStageView> {
    const stage = await this.database.pipelineStage.findFirst({
      where: { id: stageId, organizationId },
      select: { id: true },
    });

    if (!stage) {
      throw new PipelineStageNotFoundError();
    }

    return this.database.pipelineStage.update({
      where: { id: stage.id },
      data: input,
      select: pipelineStageSelect,
    });
  }

  async reorderStages(organizationId: string, stageIds: string[]): Promise<PipelineStageView[]> {
    return this.database.$transaction(async (transaction) => {
      const stages = await transaction.pipelineStage.findMany({
        where: { organizationId },
        select: { id: true, position: true },
        orderBy: { position: "asc" },
      });

      const currentStageIds = new Set(stages.map((stage) => stage.id));
      const hasAllStages =
        stages.length === stageIds.length &&
        stageIds.every((stageId) => currentStageIds.has(stageId));

      if (!hasAllStages || new Set(stageIds).size !== stageIds.length) {
        throw new InvalidPipelineStageOrderError();
      }

      await applyStagePositions(transaction, stages, stageIds);

      return transaction.pipelineStage.findMany({
        where: { organizationId },
        select: pipelineStageSelect,
        orderBy: { position: "asc" },
      });
    });
  }

  async deleteStage(organizationId: string, stageId: string): Promise<void> {
    await this.database.$transaction(async (transaction) => {
      const stages = await transaction.pipelineStage.findMany({
        where: { organizationId },
        select: {
          id: true,
          position: true,
          _count: { select: { leads: true } },
        },
        orderBy: { position: "asc" },
      });
      const stage = stages.find((currentStage) => currentStage.id === stageId);

      if (!stage) {
        throw new PipelineStageNotFoundError();
      }

      if (stage._count.leads > 0) {
        throw new PipelineStageHasLeadsError();
      }

      if (stages.length === 1) {
        throw new CannotDeleteLastPipelineStageError();
      }

      await transaction.pipelineStage.delete({ where: { id: stage.id } });

      const remainingStages = stages.filter((currentStage) => currentStage.id !== stage.id);
      await applyStagePositions(
        transaction,
        remainingStages,
        remainingStages.map((currentStage) => currentStage.id),
      );
    });
  }
}
