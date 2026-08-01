import type { FastifyReply, FastifyRequest } from "fastify";

import {
  createPipelineStageSchema,
  pipelineStageParamsSchema,
  reorderPipelineStagesSchema,
  updatePipelineStageSchema,
} from "./pipeline.schema.js";
import type { PipelineService } from "./pipeline.service.js";

export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  async listStages(request: FastifyRequest, reply: FastifyReply) {
    const stages = await this.pipelineService.listStages(request.user.organizationId);

    return reply.send({ stages });
  }

  async createStage(request: FastifyRequest, reply: FastifyReply) {
    const input = createPipelineStageSchema.parse(request.body);
    const stage = await this.pipelineService.createStage(request.user.organizationId, input);

    return reply.status(201).send({ stage });
  }

  async updateStage(request: FastifyRequest, reply: FastifyReply) {
    const { stageId } = pipelineStageParamsSchema.parse(request.params);
    const input = updatePipelineStageSchema.parse(request.body);
    const stage = await this.pipelineService.updateStage(
      request.user.organizationId,
      stageId,
      input,
    );

    return reply.send({ stage });
  }

  async reorderStages(request: FastifyRequest, reply: FastifyReply) {
    const { stageIds } = reorderPipelineStagesSchema.parse(request.body);
    const stages = await this.pipelineService.reorderStages(request.user.organizationId, stageIds);

    return reply.send({ stages });
  }

  async deleteStage(request: FastifyRequest, reply: FastifyReply) {
    const { stageId } = pipelineStageParamsSchema.parse(request.params);
    await this.pipelineService.deleteStage(request.user.organizationId, stageId);

    return reply.status(204).send();
  }
}
