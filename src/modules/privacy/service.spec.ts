import {describe,expect,it,vi} from "vitest";
import {PrivacyService} from "./service.js";

describe("PrivacyService",()=>{
 it("updates retention and records an audit event",async()=>{
  const update=vi.fn().mockResolvedValue({id:"org-1",name:"Imobiliária",dataRetentionDays:365});
  const log=vi.fn().mockResolvedValue(undefined);
  const service=new PrivacyService({organization:{update}} as never,{log} as never);
  await service.updateRetention("org-1","user-1",365);
  expect(update).toHaveBeenCalledWith(expect.objectContaining({where:{id:"org-1"},data:{dataRetentionDays:365}}));
  expect(log).toHaveBeenCalledWith(expect.objectContaining({organizationId:"org-1",userId:"user-1",action:"RETENTION_POLICY_UPDATED"}));
 });
});
