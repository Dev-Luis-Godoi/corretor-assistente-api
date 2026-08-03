import { z } from "zod";

export const listUsersQuerySchema = z.object({ search: z.string().trim().min(1).max(120).optional() });
