import type { FastifyReply, FastifyRequest } from "fastify";
import { listUsersQuerySchema, updatePasswordSchema, updateProfileSchema } from "./schemas.js";
import type { UserService } from "./service.js";

export class UserController {
  constructor(private readonly service: UserService) {}
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { search } = listUsersQuerySchema.parse(request.query);
    return reply.send({ users: await this.service.list(request.user.organizationId, search) });
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const user = await this.service.updateProfile(request.user.sub, updateProfileSchema.parse(request.body));
    return reply.send({ user });
  }

  async updatePassword(request: FastifyRequest, reply: FastifyReply) {
    await this.service.updatePassword(request.user.sub, updatePasswordSchema.parse(request.body));
    return reply.status(204).send();
  }
}
