import { z } from "zod";
const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();
export const relationshipParamsSchema = z.object({ id: z.uuid() }).strict();
export const listRelationshipsQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export const createRelationshipSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    phone: optionalText(30),
    email: z.email().max(254).optional(),
    document: optionalText(30),
    notes: optionalText(5_000),
  })
  .strict();
export const updateRelationshipSchema = createRelationshipSchema
  .partial()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });
export type ListRelationshipsQuery = z.infer<typeof listRelationshipsQuerySchema>;
export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
export type UpdateRelationshipInput = z.infer<typeof updateRelationshipSchema>;
