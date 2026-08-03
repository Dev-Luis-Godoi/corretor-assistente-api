import { z } from "zod";

import { TaskPriority, TaskStatus } from "@/generated/prisma/enums.js";

export const listTasksQuerySchema = z.object({
  status: z.enum(TaskStatus).optional(),
  assignedUserId: z.uuid().optional(),
  leadId: z.uuid().optional(),
  from: z.iso.datetime().transform((value) => new Date(value)).optional(),
  to: z.iso.datetime().transform((value) => new Date(value)).optional(),
}).refine((input) => !input.from || !input.to || input.from <= input.to, { message: "Invalid date range" });

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2_000).optional(),
  dueAt: z.iso.datetime().transform((value) => new Date(value)),
  priority: z.enum(TaskPriority).default("MEDIUM"),
  leadId: z.uuid().optional(),
  assignedUserId: z.uuid().optional(),
}).strict();

export const updateTaskSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2_000).nullable().optional(),
  dueAt: z.iso.datetime().transform((value) => new Date(value)).optional(),
  priority: z.enum(TaskPriority).optional(),
  status: z.enum(TaskStatus).optional(),
  assignedUserId: z.uuid().nullable().optional(),
}).strict().refine((input) => Object.values(input).some((value) => value !== undefined), { message: "At least one field must be provided" });

export const taskParamsSchema = z.object({ id: z.uuid() }).strict();
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
