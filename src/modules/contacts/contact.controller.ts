import type { FastifyReply, FastifyRequest } from "fastify";

import {
  contactParamsSchema,
  createContactSchema,
  listContactsQuerySchema,
  updateContactSchema,
} from "./contact.schema.js";
import type { ContactService } from "./contact.service.js";

export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = createContactSchema.parse(request.body);
    const contact = await this.contactService.create(request.user.organizationId, input);

    return reply.status(201).send({ contact });
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listContactsQuerySchema.parse(request.query);
    const result = await this.contactService.list(request.user.organizationId, query);

    return reply.send(result);
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { contactId } = contactParamsSchema.parse(request.params);
    const contact = await this.contactService.getById(request.user.organizationId, contactId);

    return reply.send({ contact });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { contactId } = contactParamsSchema.parse(request.params);
    const input = updateContactSchema.parse(request.body);
    const contact = await this.contactService.update(request.user.organizationId, contactId, input);

    return reply.send({ contact });
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { contactId } = contactParamsSchema.parse(request.params);
    await this.contactService.delete(request.user.organizationId, contactId);

    return reply.status(204).send();
  }
}
