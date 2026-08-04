import {describe,expect,it,vi} from "vitest";
import {NotificationService} from "./service.js";

describe("NotificationService",()=>{
 it("builds real alerts scoped to the organization",async()=>{
  const database={
   conversation:{findMany:vi.fn().mockResolvedValue([{id:"conversation-1",unreadCount:2,lastMessageAt:new Date(),contact:{name:"Cliente",phone:"5511999999999"}}])},
   task:{findMany:vi.fn().mockResolvedValue([])},
   lead:{findMany:vi.fn().mockResolvedValue([])},
   notificationDismissal:{findMany:vi.fn().mockResolvedValue([])},
  };
  const result=await new NotificationService(database as never).list("org-1","user-1");
  expect(result.total).toBe(1);
  expect(result.items[0]).toMatchObject({key:"conversation:conversation-1",type:"NEW_MESSAGE",href:"/conversations?conversation=conversation-1"});
  expect(JSON.stringify(database.conversation.findMany.mock.calls)).toContain("org-1");
 });
});
