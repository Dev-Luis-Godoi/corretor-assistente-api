import type { FastifyRequest } from "fastify";
import { AppError } from "@/shared/errors/app-error.js";

interface Entry {
  count: number;
  resetAt: number;
}

export function createRateLimit(limit: number, windowMs: number) {
  const entries = new Map<string, Entry>();

  return function rateLimit(request: FastifyRequest) {
    const now = Date.now();
    const key = request.ip;
    const entry = entries.get(key);

    if (!entry || entry.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + windowMs });
      return Promise.resolve();
    }

    if (entry.count >= limit) throw new AppError("Too many requests", 429, "RATE_LIMITED");

    entry.count += 1;

    if (entries.size > 10_000) {
      for (const [currentKey, current] of entries) {
        if (current.resetAt <= now) entries.delete(currentKey);
      }
    }

    return Promise.resolve();
  };
}
