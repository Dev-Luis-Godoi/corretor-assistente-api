import type { FastifyReply, FastifyRequest } from "fastify";
import { createTaskSchema, listTasksQuerySchema, taskParamsSchema, updateTaskSchema } from "./task.schemas.js";
import type { TaskService } from "./task.service.js";

export class TaskController {
  constructor(private readonly service: TaskService) {}
  async list(request: FastifyRequest, reply: FastifyReply) { return reply.send({ tasks: await this.service.list(request.user.organizationId, listTasksQuerySchema.parse(request.query)) }); }
  async create(request: FastifyRequest, reply: FastifyReply) { return reply.status(201).send({ task: await this.service.create(request.user.organizationId, createTaskSchema.parse(request.body), request.user.sub) }); }
  async update(request: FastifyRequest, reply: FastifyReply) { const { id } = taskParamsSchema.parse(request.params); return reply.send({ task: await this.service.update(request.user.organizationId, id, updateTaskSchema.parse(request.body)) }); }
  async remove(request: FastifyRequest, reply: FastifyReply) { const { id } = taskParamsSchema.parse(request.params); await this.service.remove(request.user.organizationId, id); return reply.status(204).send(); }
}
