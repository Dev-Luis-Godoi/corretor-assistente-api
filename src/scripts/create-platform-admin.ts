import { z } from "zod";
import { prisma } from "@/infra/database/prisma.js";
import { PasswordService } from "@/shared/crypto/password.service.js";

const input = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(12).max(72),
  })
  .parse({
    name: process.env.PLATFORM_ADMIN_NAME,
    email: process.env.PLATFORM_ADMIN_EMAIL,
    password: process.env.PLATFORM_ADMIN_PASSWORD,
  });

const passwordHash = await new PasswordService().hash(input.password);
await prisma.platformAdmin.upsert({
  where: { email: input.email },
  create: { name: input.name, email: input.email, passwordHash },
  update: { name: input.name, passwordHash, active: true, sessionVersion: { increment: 1 } },
});
await prisma.$disconnect();
console.log(`Platform administrator ready: ${input.email}`);
