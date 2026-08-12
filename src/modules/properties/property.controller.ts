import type { FastifyReply, FastifyRequest } from "fastify";

import {
  confirmPropertyPhotoSchema,
  createPropertySchema,
  listPropertiesQuerySchema,
  preparePropertyPhotoSchema,
  propertyParamsSchema,
  propertyPhotoParamsSchema,
  updatePropertySchema,
} from "./property.schemas.js";
import type { PropertyService } from "./property.service.js";

export class PropertyController {
  constructor(private readonly service: PropertyService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(
      await this.service.list(
        request.user.organizationId,
        listPropertiesQuerySchema.parse(request.query),
      ),
    );
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = propertyParamsSchema.parse(request.params);
    return reply.send({
      property: await this.service.getById(request.user.organizationId, id),
    });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    return reply.status(201).send({
      property: await this.service.create(
        request.user.organizationId,
        createPropertySchema.parse(request.body),
      ),
    });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = propertyParamsSchema.parse(request.params);
    return reply.send({
      property: await this.service.update(
        request.user.organizationId,
        id,
        updatePropertySchema.parse(request.body),
      ),
    });
  }

  async storageStatus(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(this.service.storageStatus());
  }

  async preparePhotoUpload(request: FastifyRequest, reply: FastifyReply) {
    const { id } = propertyParamsSchema.parse(request.params);
    return reply.send(
      await this.service.preparePhotoUpload(
        request.user.organizationId,
        id,
        preparePropertyPhotoSchema.parse(request.body),
      ),
    );
  }

  async confirmPhoto(request: FastifyRequest, reply: FastifyReply) {
    const { id } = propertyParamsSchema.parse(request.params);
    const { objectKey } = confirmPropertyPhotoSchema.parse(request.body);
    return reply.status(201).send({
      property: await this.service.confirmPhoto(
        request.user.organizationId,
        id,
        objectKey,
      ),
    });
  }

  async removePhoto(request: FastifyRequest, reply: FastifyReply) {
    const { id, photoId } = propertyPhotoParamsSchema.parse(request.params);
    return reply.send({
      property: await this.service.removePhoto(
        request.user.organizationId,
        id,
        photoId,
      ),
    });
  }

  async setCover(request: FastifyRequest, reply: FastifyReply) {
    const { id, photoId } = propertyPhotoParamsSchema.parse(request.params);
    return reply.send({
      property: await this.service.setCover(
        request.user.organizationId,
        id,
        photoId,
      ),
    });
  }
}
