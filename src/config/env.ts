import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().max(65_535).default(3333),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173")
    .refine(
      (value) =>
        value !== "*" &&
        value.split(",").every((origin) => z.url().safeParse(origin.trim()).success),
      "CORS_ORIGIN must contain explicit comma-separated URLs",
    ),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables", z.flattenError(parsedEnv.error).fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsedEnv.data;
