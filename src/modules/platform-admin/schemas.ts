import { AccountStatus } from "@/generated/prisma/enums.js";
import { z } from "zod";

export const platformAdminLoginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(72),
});

export const platformAccountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  status: z.enum(AccountStatus).optional(),
});

export const platformAccountParamsSchema = z.object({ id: z.uuid() });
export const updatePlatformAccountStatusSchema = z.object({ status: z.enum(AccountStatus) });

export type PlatformAdminLoginInput = z.infer<typeof platformAdminLoginSchema>;
export type PlatformAccountsQuery = z.infer<typeof platformAccountsQuerySchema>;
