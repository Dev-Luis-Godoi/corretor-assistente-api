import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createRelationshipSchema,
  listRelationshipsQuerySchema,
  relationshipParamsSchema,
  updateRelationshipSchema,
} from "./relationship.schemas.js";
import type { RelationshipService } from "./relationship.service.js";
export class RelationshipController {
  constructor(private readonly service: RelationshipService) {}
  async listOwners(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(
      await this.service.listOwners(
        request.user.organizationId,
        listRelationshipsQuerySchema.parse(request.query),
      ),
    );
  }
  async listClients(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(
      await this.service.listClients(
        request.user.organizationId,
        listRelationshipsQuerySchema.parse(request.query),
      ),
    );
  }
  async createOwner(request: FastifyRequest, reply: FastifyReply) {
    return reply.status(201).send({
      owner: await this.service.createOwner(
        request.user.organizationId,
        createRelationshipSchema.parse(request.body),
      ),
    });
  }
  async createClient(request: FastifyRequest, reply: FastifyReply) {
    return reply.status(201).send({
      client: await this.service.createClient(
        request.user.organizationId,
        createRelationshipSchema.parse(request.body),
      ),
    });
  }
  async updateOwner(request: FastifyRequest, reply: FastifyReply) {
    const { id } = relationshipParamsSchema.parse(request.params);
    return reply.send({
      owner: await this.service.updateOwner(
        request.user.organizationId,
        id,
        updateRelationshipSchema.parse(request.body),
      ),
    });
  }
  async updateClient(request: FastifyRequest, reply: FastifyReply) {
    const { id } = relationshipParamsSchema.parse(request.params);
    return reply.send({
      client: await this.service.updateClient(
        request.user.organizationId,
        id,
        updateRelationshipSchema.parse(request.body),
      ),
    });
  }
  async deleteOwner(request: FastifyRequest, reply: FastifyReply) {
    const { id } = relationshipParamsSchema.parse(request.params);
    await this.service.deleteOwner(request.user.organizationId, id);
    return reply.status(204).send();
  }
  async deleteClient(request: FastifyRequest, reply: FastifyReply) {
    const { id } = relationshipParamsSchema.parse(request.params);
    await this.service.deleteClient(request.user.organizationId, id);
    return reply.status(204).send();
  }
}
