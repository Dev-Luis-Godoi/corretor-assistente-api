import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .transform((phone) => phone.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number"));

const optionalNameSchema = z.string().trim().min(2).max(120).optional();
const optionalEmailSchema = z.email().trim().toLowerCase().optional();
const optionalAvatarUrlSchema = z.url().max(2_048).optional();

export const createContactSchema = z
  .object({
    name: optionalNameSchema,
    phone: phoneSchema,
    email: optionalEmailSchema,
    avatarUrl: optionalAvatarUrlSchema,
  })
  .strict();

export const updateContactSchema = z
  .object({
    name: optionalNameSchema.nullable(),
    phone: phoneSchema.optional(),
    email: optionalEmailSchema.nullable(),
    avatarUrl: optionalAvatarUrlSchema.nullable(),
  })
  .strict()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });

export const contactParamsSchema = z
  .object({
    contactId: z.uuid(),
  })
  .strict();

export const listContactsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;
