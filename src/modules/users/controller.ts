import type { FastifyReply, FastifyRequest } from "fastify";
import { listUsersQuerySchema } from "./schemas.js";
import type { UserService } from "./service.js";

export class UserController {
  constructor(private readonly service: UserService) {}
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { search } = listUsersQuerySchema.parse(request.query);
    return reply.send({ users: await this.service.list(request.user.organizationId, search) });
  }
}
