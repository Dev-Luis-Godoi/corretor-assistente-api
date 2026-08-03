CREATE TYPE "MessageDeliveryStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');
CREATE TYPE "LeadActivityType" AS ENUM ('CREATED', 'NOTE', 'CALL', 'EMAIL', 'WHATSAPP', 'STAGE_CHANGED');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "TemplateChannel" AS ENUM ('WHATSAPP', 'EMAIL');
CREATE TYPE "AutomationTrigger" AS ENUM ('LEAD_CREATED', 'STAGE_CHANGED');
CREATE TYPE "AutomationAction" AS ENUM ('CREATE_TASK', 'ASSIGN_LEAD');

ALTER TABLE "Conversation" ADD COLUMN "leadId" TEXT;
ALTER TABLE "Message" ADD COLUMN "deliveryStatus" "MessageDeliveryStatus" NOT NULL DEFAULT 'SENT', ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "interest" TEXT, ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[], ADD COLUMN "nextFollowUpAt" TIMESTAMP(3), ADD COLUMN "expectedCloseAt" TIMESTAMP(3), ADD COLUMN "lastInteractionAt" TIMESTAMP(3);

CREATE TABLE "LeadActivity" (
  "id" TEXT NOT NULL, "type" "LeadActivityType" NOT NULL, "description" TEXT NOT NULL, "metadata" JSONB,
  "organizationId" TEXT NOT NULL, "leadId" TEXT NOT NULL, "createdById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LeadStageHistory" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "leadId" TEXT NOT NULL, "fromStageId" TEXT, "toStageId" TEXT NOT NULL, "changedById" TEXT, "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadStageHistory_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Task" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "dueAt" TIMESTAMP(3) NOT NULL, "status" "TaskStatus" NOT NULL DEFAULT 'PENDING', "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM', "completedAt" TIMESTAMP(3),
  "organizationId" TEXT NOT NULL, "leadId" TEXT, "assignedUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MessageTemplate" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "channel" "TemplateChannel" NOT NULL DEFAULT 'WHATSAPP', "content" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AutomationRule" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "trigger" "AutomationTrigger" NOT NULL, "action" "AutomationAction" NOT NULL, "stageId" TEXT, "delayMinutes" INTEGER NOT NULL DEFAULT 0, "enabled" BOOLEAN NOT NULL DEFAULT false, "organizationId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Conversation_leadId_idx" ON "Conversation"("leadId");
CREATE INDEX "LeadActivity_organizationId_idx" ON "LeadActivity"("organizationId");
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");
CREATE INDEX "LeadStageHistory_organizationId_idx" ON "LeadStageHistory"("organizationId");
CREATE INDEX "LeadStageHistory_leadId_changedAt_idx" ON "LeadStageHistory"("leadId", "changedAt");
CREATE INDEX "Task_organizationId_dueAt_idx" ON "Task"("organizationId", "dueAt");
CREATE INDEX "Task_leadId_idx" ON "Task"("leadId");
CREATE INDEX "Task_assignedUserId_idx" ON "Task"("assignedUserId");
CREATE UNIQUE INDEX "MessageTemplate_organizationId_name_key" ON "MessageTemplate"("organizationId", "name");
CREATE INDEX "MessageTemplate_organizationId_idx" ON "MessageTemplate"("organizationId");
CREATE INDEX "AutomationRule_organizationId_idx" ON "AutomationRule"("organizationId");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadStageHistory" ADD CONSTRAINT "LeadStageHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadStageHistory" ADD CONSTRAINT "LeadStageHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadStageHistory" ADD CONSTRAINT "LeadStageHistory_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
