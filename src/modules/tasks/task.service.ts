import { TaskStatus, type PrismaClient } from "@/generated/prisma/client.js";
import type { Prisma } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";

import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "./task.schemas.js";

const taskSelect = {
  id: true, title: true, description: true, dueAt: true, status: true, priority: true, completedAt: true,
  lead: { select: { id: true, title: true, contact: { select: { name: true, phone: true } } } },
  assignedUser: { select: { id: true, name: true, email: true } }, createdAt: true, updatedAt: true,
} satisfies Prisma.TaskSelect;

export class TaskService {
  constructor(private readonly database: PrismaClient) {}

  async list(organizationId: string, query: ListTasksQuery) {
    return this.database.task.findMany({
      where: { organizationId, status: query.status, assignedUserId: query.assignedUserId, leadId: query.leadId, dueAt: query.from || query.to ? { gte: query.from, lte: query.to } : undefined },
      select: taskSelect,
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 200,
    });
  }

  async create(organizationId: string, input: CreateTaskInput, currentUserId: string) {
    await this.validateRelations(organizationId, input.leadId, input.assignedUserId);
    return this.database.task.create({ data: { ...input, organizationId, assignedUserId: input.assignedUserId ?? currentUserId }, select: taskSelect });
  }

  async update(organizationId: string, taskId: string, input: UpdateTaskInput) {
    const task = await this.database.task.findFirst({ where: { id: taskId, organizationId }, select: { id: true } });
    if (!task) throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
    if (input.assignedUserId) await this.validateRelations(organizationId, undefined, input.assignedUserId);
    const completedAt = input.status === TaskStatus.COMPLETED ? new Date() : input.status ? null : undefined;
    return this.database.task.update({ where: { id: task.id }, data: { ...input, completedAt }, select: taskSelect });
  }

  async remove(organizationId: string, taskId: string) {
    const deleted = await this.database.task.deleteMany({ where: { id: taskId, organizationId } });
    if (deleted.count === 0) throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
  }

  private async validateRelations(organizationId: string, leadId?: string, assignedUserId?: string) {
    const [lead, user] = await Promise.all([
      leadId ? this.database.lead.findFirst({ where: { id: leadId, organizationId }, select: { id: true } }) : Promise.resolve({ id: "" }),
      assignedUserId ? this.database.user.findFirst({ where: { id: assignedUserId, organizationId }, select: { id: true } }) : Promise.resolve({ id: "" }),
    ]);
    if (leadId && !lead) throw new AppError("Lead not found", 404, "LEAD_NOT_FOUND");
    if (assignedUserId && !user) throw new AppError("Assigned user not found", 404, "ASSIGNED_USER_NOT_FOUND");
  }
}
