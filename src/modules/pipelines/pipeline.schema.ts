import { z } from "zod";

const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hexadecimal color");

export const createPipelineStageSchema = z
  .object({
    name: z.string().trim().min(2).max(50),
    color: colorSchema.optional(),
  })
  .strict();

export const updatePipelineStageSchema = z
  .object({
    name: z.string().trim().min(2).max(50).optional(),
    color: colorSchema.optional(),
  })
  .strict()
  .refine((input) => input.name !== undefined || input.color !== undefined, {
    message: "At least one field must be provided",
  });

export const pipelineStageParamsSchema = z
  .object({
    stageId: z.uuid(),
  })
  .strict();

export const reorderPipelineStagesSchema = z
  .object({
    stageIds: z.array(z.uuid()).min(1),
  })
  .strict()
  .refine((input) => new Set(input.stageIds).size === input.stageIds.length, {
    message: "Stage IDs must not contain duplicates",
    path: ["stageIds"],
  });
