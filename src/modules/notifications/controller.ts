import type { FastifyReply, FastifyRequest } from "fastify";
import { dismissNotificationsSchema } from "./schemas.js";
import type { NotificationService } from "./service.js";

export class NotificationController {
  constructor(private readonly service: NotificationService) {}
  async list(request: FastifyRequest, reply: FastifyReply) { return reply.send(await this.service.list(request.user.organizationId, request.user.sub)); }
  async dismiss(request: FastifyRequest, reply: FastifyReply) { const {keys}=dismissNotificationsSchema.parse(request.body);await this.service.dismiss(request.user.organizationId,request.user.sub,keys);return reply.status(204).send(); }
}
