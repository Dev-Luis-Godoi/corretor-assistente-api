import { TaskStatus, type PrismaClient } from "@/generated/prisma/client.js";

export interface NotificationItem {
  key: string;
  type: "NEW_MESSAGE" | "TASK_DUE" | "LEAD_FOLLOW_UP";
  title: string;
  description: string;
  href: string;
  occurredAt: Date;
}

export class NotificationService {
  constructor(private readonly database: PrismaClient) {}

  async list(organizationId: string, userId: string) {
    const now = new Date();
    const nextDay = new Date(now.getTime() + 24 * 60 * 60_000);
    const [conversations, tasks, leads, dismissed] = await Promise.all([
      this.database.conversation.findMany({ where: { organizationId, status: "OPEN", unreadCount: { gt: 0 } }, select: { id: true, unreadCount: true, lastMessageAt: true, contact: { select: { name: true, phone: true } } }, orderBy: { lastMessageAt: "desc" }, take: 15 }),
      this.database.task.findMany({ where: { organizationId, status: TaskStatus.PENDING, dueAt: { lte: nextDay }, OR: [{ assignedUserId: userId }, { assignedUserId: null }] }, select: { id: true, title: true, dueAt: true }, orderBy: { dueAt: "asc" }, take: 15 }),
      this.database.lead.findMany({ where: { organizationId, stage: { isWon: false, isLost: false }, OR: [{ assignedUserId: userId }, { assignedUserId: null }], AND: [{ OR: [{ nextFollowUpAt: null }, { nextFollowUpAt: { lte: now } }] }] }, select: { id: true, title: true, nextFollowUpAt: true, updatedAt: true, contact: { select: { name: true, phone: true } } }, orderBy: { updatedAt: "asc" }, take: 15 }),
      this.database.notificationDismissal.findMany({ where: { organizationId, userId }, select: { key: true, dismissedAt: true } }),
    ]);
    const hidden = new Map(dismissed.map(item=>[item.key,item.dismissedAt]));
    const items: NotificationItem[] = [
      ...conversations.map(item=>({ key:`conversation:${item.id}`, type:"NEW_MESSAGE" as const, title:`${item.unreadCount} ${item.unreadCount===1?"mensagem não lida":"mensagens não lidas"}`, description:item.contact.name??item.contact.phone, href:`/conversations?conversation=${item.id}`, occurredAt:item.lastMessageAt??now })),
      ...tasks.map(item=>({ key:`task:${item.id}`, type:"TASK_DUE" as const, title:item.dueAt<now?"Tarefa atrasada":"Tarefa próxima", description:item.title, href:`/tasks`, occurredAt:item.dueAt })),
      ...leads.map(item=>({ key:`lead:${item.id}`, type:"LEAD_FOLLOW_UP" as const, title:item.nextFollowUpAt?"Follow-up vencido":"Lead sem follow-up", description:item.contact.name??item.title, href:`/leads?lead=${item.id}`, occurredAt:item.nextFollowUpAt??item.updatedAt })),
    ].filter(item=>{const dismissedAt=hidden.get(item.key);return !dismissedAt||item.occurredAt>dismissedAt}).sort((a,b)=>b.occurredAt.getTime()-a.occurredAt.getTime()).slice(0,30);
    return { items, total: items.length };
  }

  async dismiss(organizationId: string, userId: string, keys: string[]) {
    await this.database.$transaction(keys.map(key=>this.database.notificationDismissal.upsert({ where: { userId_key: { userId, key } }, create: { organizationId, userId, key }, update: { dismissedAt: new Date() } })));
  }
}
