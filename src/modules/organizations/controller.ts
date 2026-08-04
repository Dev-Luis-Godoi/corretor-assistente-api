import type { FastifyReply, FastifyRequest } from "fastify";
import { updateOrganizationSchema } from "./schemas.js";
import type { OrganizationService } from "./service.js";

export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  async get(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ organization: await this.service.get(request.user.organizationId) });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const organization = await this.service.update(
      request.user.organizationId,
      request.user.sub,
      updateOrganizationSchema.parse(request.body),
    );
    return reply.send({ organization });
  }
}
