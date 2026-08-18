import { z } from "zod";

import { PropertyPurpose, PropertyStatus, PropertyType } from "@/generated/prisma/enums.js";

const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();
const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();
const money = z.coerce.number().min(0).max(999_999_999_999.99);
const optionalMoney = money.optional();
const nullableMoney = money.nullable().optional();
const count = z.coerce.number().int().min(0).max(100);
const state = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase());
const amenities = z.array(z.string().trim().min(1).max(80)).max(30);

export const propertyParamsSchema = z.object({ id: z.uuid() }).strict();
export const propertyPhotoParamsSchema = z.object({ id: z.uuid(), photoId: z.uuid() }).strict();

export const listPropertiesQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    status: z.enum(PropertyStatus).optional(),
    type: z.enum(PropertyType).optional(),
    purpose: z.enum(PropertyPurpose).optional(),
    ownerId: z.uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(48).default(24),
  })
  .strict();

export const createPropertySchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    reference: optionalText(40),
    description: optionalText(5_000),
    type: z.enum(PropertyType),
    purpose: z.enum(PropertyPurpose),
    ownerId: z.uuid().optional(),
    status: z.enum(PropertyStatus).default("AVAILABLE"),
    price: money,
    condominiumFee: optionalMoney,
    propertyTax: optionalMoney,
    areaM2: z.coerce.number().positive().max(1_000_000).optional(),
    bedrooms: count.default(0),
    suites: count.default(0),
    bathrooms: count.default(0),
    parkingSpots: count.default(0),
    address: optionalText(200),
    neighborhood: optionalText(120),
    city: z.string().trim().min(2).max(120),
    state,
    zipCode: z
      .string()
      .trim()
      .regex(/^\d{8}$/)
      .optional(),
    amenities: amenities.default([]),
    featured: z.boolean().default(false),
  })
  .strict();

export const updatePropertySchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    reference: nullableText(40),
    description: nullableText(5_000),
    type: z.enum(PropertyType).optional(),
    purpose: z.enum(PropertyPurpose).optional(),
    ownerId: z.uuid().nullable().optional(),
    status: z.enum(PropertyStatus).optional(),
    price: money.optional(),
    condominiumFee: nullableMoney,
    propertyTax: nullableMoney,
    areaM2: z.coerce.number().positive().max(1_000_000).nullable().optional(),
    bedrooms: count.optional(),
    suites: count.optional(),
    bathrooms: count.optional(),
    parkingSpots: count.optional(),
    address: nullableText(200),
    neighborhood: nullableText(120),
    city: z.string().trim().min(2).max(120).optional(),
    state: state.optional(),
    zipCode: z
      .string()
      .trim()
      .regex(/^\d{8}$/)
      .nullable()
      .optional(),
    amenities: amenities.optional(),
    featured: z.boolean().optional(),
  })
  .strict()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });

export const preparePropertyPhotoSchema = z
  .object({
    fileName: z.string().trim().min(1).max(180),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.coerce
      .number()
      .int()
      .positive()
      .max(6 * 1024 * 1024),
  })
  .strict();

export const confirmPropertyPhotoSchema = z
  .object({ objectKey: z.string().min(20).max(500) })
  .strict();

export type ListPropertiesQuery = z.infer<typeof listPropertiesQuerySchema>;
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PreparePropertyPhotoInput = z.infer<typeof preparePropertyPhotoSchema>;
