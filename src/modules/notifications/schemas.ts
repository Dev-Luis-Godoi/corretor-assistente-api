import { z } from "zod";

export const dismissNotificationsSchema = z.object({
  keys: z.array(z.string().min(3).max(160)).min(1).max(100),
}).strict();
