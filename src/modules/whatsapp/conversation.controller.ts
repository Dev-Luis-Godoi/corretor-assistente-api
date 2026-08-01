import type { FastifyReply, FastifyRequest } from "fastify";

import { conversationParamsSchema, listConversationsQuerySchema } from "./conversation.schemas.js";
import type { ConversationService } from "./conversation.service.js";

export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listConversationsQuerySchema.parse(request.query);
    const result = await this.conversationService.list(request.user.organizationId, query);

    return reply.send(result);
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = conversationParamsSchema.parse(request.params);
    const conversation = await this.conversationService.getById(request.user.organizationId, id);

    return reply.send({ conversation });
  }
}
