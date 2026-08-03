import type { FastifyReply, FastifyRequest } from "fastify";
import type { DashboardService } from "./dashboard.service.js";

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  async summary(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await this.dashboardService.summary(request.user.organizationId));
  }
}
