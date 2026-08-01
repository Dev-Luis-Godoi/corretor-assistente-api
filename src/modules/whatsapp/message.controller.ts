import type { FastifyReply, FastifyRequest } from "fastify";

import { listMessagesParamsSchema, listMessagesQuerySchema } from "./message.schemas.js";
import type { MessageService } from "./message.service.js";

export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  async listByConversation(request: FastifyRequest, reply: FastifyReply) {
    const { conversationId } = listMessagesParamsSchema.parse(request.params);
    const query = listMessagesQuerySchema.parse(request.query);
    const result = await this.messageService.listByConversation(
      request.user.organizationId,
      conversationId,
      query,
    );

    return reply.send(result);
  }
}
