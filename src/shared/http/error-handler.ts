import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

import { env } from "@/config/env.js";
import { AppError } from "@/shared/errors/app-error.js";

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Invalid request data",
      issues: error.issues,
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  const statusCode = "statusCode" in error && error.statusCode ? error.statusCode : 500;

  if (statusCode >= 500) {
    request.log.error(error);
  }

  return reply.status(statusCode).send({
    error: statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR",
    message:
      statusCode >= 500 && env.NODE_ENV === "production" ? "Internal server error" : error.message,
  });
}
