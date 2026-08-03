import type { FastifyReply, FastifyRequest } from "fastify";

import { listMessagesParamsSchema, listMessagesQuerySchema, sendTextMessageSchema } from "./message.schemas.js";
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

  async sendText(request: FastifyRequest, reply: FastifyReply) {
    const { conversationId } = listMessagesParamsSchema.parse(request.params);
    const message = await this.messageService.sendText(request.user.organizationId, conversationId, sendTextMessageSchema.parse(request.body));
    return reply.status(201).send({ message });
  }
}
