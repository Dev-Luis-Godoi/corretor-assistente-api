import {describe,expect,it} from "vitest";
import {sendMediaMessageSchema} from "./message.schemas.js";

describe("sendMediaMessageSchema",()=>{
 it("accepts only matching media and MIME types",()=>{
  expect(sendMediaMessageSchema.safeParse({type:"IMAGE",mimeType:"image/png",fileName:"foto.png",base64:"YWJjZA=="}).success).toBe(true);
  expect(sendMediaMessageSchema.safeParse({type:"DOCUMENT",mimeType:"image/png",fileName:"arquivo.png",base64:"YWJjZA=="}).success).toBe(false);
  expect(sendMediaMessageSchema.safeParse({type:"DOCUMENT",mimeType:"application/pdf",fileName:"../segredo.pdf",base64:"YWJjZA=="}).success).toBe(false);
 });
});
