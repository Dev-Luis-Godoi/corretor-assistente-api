import type {FastifyReply,FastifyRequest} from "fastify";
import {auditQuerySchema,contactPrivacyParamsSchema,updateConsentSchema,updateRetentionSchema} from "./schemas.js";
import type {PrivacyService} from "./service.js";

export class PrivacyController{constructor(private readonly service:PrivacyService){}
 async settings(request:FastifyRequest,reply:FastifyReply){return reply.send({settings:await this.service.settings(request.user.organizationId)})}
 async updateRetention(request:FastifyRequest,reply:FastifyReply){const {dataRetentionDays}=updateRetentionSchema.parse(request.body);return reply.send({settings:await this.service.updateRetention(request.user.organizationId,request.user.sub,dataRetentionDays)})}
 async exportOrganization(request:FastifyRequest,reply:FastifyReply){return reply.send(await this.service.exportOrganization(request.user.organizationId,request.user.sub))}
 async exportContact(request:FastifyRequest,reply:FastifyReply){const {contactId}=contactPrivacyParamsSchema.parse(request.params);return reply.send(await this.service.exportContact(request.user.organizationId,request.user.sub,contactId))}
 async updateConsent(request:FastifyRequest,reply:FastifyReply){const {contactId}=contactPrivacyParamsSchema.parse(request.params);return reply.send({contact:await this.service.updateConsent(request.user.organizationId,request.user.sub,contactId,updateConsentSchema.parse(request.body))})}
 async deleteContact(request:FastifyRequest,reply:FastifyReply){const {contactId}=contactPrivacyParamsSchema.parse(request.params);await this.service.deleteContact(request.user.organizationId,request.user.sub,contactId);return reply.status(204).send()}
 async applyRetention(request:FastifyRequest,reply:FastifyReply){return reply.send(await this.service.applyRetention(request.user.organizationId,request.user.sub))}
 async auditLogs(request:FastifyRequest,reply:FastifyReply){const {limit}=auditQuerySchema.parse(request.query);return reply.send({logs:await this.service.auditLogs(request.user.organizationId,limit)})}
}
