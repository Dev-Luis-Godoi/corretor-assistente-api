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
    isWon: z.boolean().optional(),
    isLost: z.boolean().optional(),
  })
  .strict()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  })
  .refine((input) => !(input.isWon && input.isLost), { message: "A stage cannot be won and lost at the same time" });

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
