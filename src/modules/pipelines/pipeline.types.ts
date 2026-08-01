import type { z } from "zod";

import type {
  createPipelineStageSchema,
  reorderPipelineStagesSchema,
  updatePipelineStageSchema,
} from "./pipeline.schema.js";

export type CreatePipelineStageInput = z.infer<typeof createPipelineStageSchema>;
export type UpdatePipelineStageInput = z.infer<typeof updatePipelineStageSchema>;
export type ReorderPipelineStagesInput = z.infer<typeof reorderPipelineStagesSchema>;
