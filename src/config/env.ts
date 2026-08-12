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
  ADMIN_JWT_SECRET: z.string().min(32, "ADMIN_JWT_SECRET must contain at least 32 characters"),
  APP_URL: z.url().default("http://localhost:5173"),
  PUBLIC_API_URL: z.url().optional(),
  EVOLUTION_API_URL: z.url().optional(),
  EVOLUTION_API_KEY: z.string().min(32).optional(),
  EVOLUTION_WEBHOOK_SECRET: z.string().min(32).optional(),
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  RESEND_FROM_EMAIL: z.email().optional(),
  R2_ACCOUNT_ID: z.string().min(20).optional(),
  R2_ACCESS_KEY_ID: z.string().min(20).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(32).optional(),
  R2_BUCKET: z.string().min(3).optional(),
  R2_PUBLIC_BASE_URL: z.url().optional(),
}).superRefine((value, context) => {
  const r2Values = [
    value.R2_ACCOUNT_ID,
    value.R2_ACCESS_KEY_ID,
    value.R2_SECRET_ACCESS_KEY,
    value.R2_BUCKET,
    value.R2_PUBLIC_BASE_URL,
  ];
  if (r2Values.some(Boolean) && !r2Values.every(Boolean)) {
    context.addIssue({
      code: "custom",
      path: ["R2_ACCOUNT_ID"],
      message: "All R2 variables must be configured together",
    });
  }
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables", z.flattenError(parsedEnv.error).fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsedEnv.data;
