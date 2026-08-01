import type { FastifyReply, FastifyRequest } from "fastify";

export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  await request.jwtVerify();
}
