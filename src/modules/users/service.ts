import { Prisma, type PrismaClient } from "@/generated/prisma/client.js";
import type { PasswordService } from "@/shared/crypto/password.service.js";
import { AppError } from "@/shared/errors/app-error.js";
import type { UpdatePasswordInput, UpdateProfileInput } from "./schemas.js";

const currentUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  organization: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

export class UserService {
  constructor(
    private readonly database: PrismaClient,
    private readonly passwordService: PasswordService,
  ) {}

  list(organizationId: string, search?: string) {
    return this.database.user.findMany({
      where: {
        organizationId,
        OR: search
          ? [
              { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
            ]
          : undefined,
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    try {
      return await this.database.user.update({
        where: { id: userId },
        data: input,
        select: currentUserSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Email is already in use", 409, "EMAIL_ALREADY_IN_USE");
      }
      throw error;
    }
  }

  async updatePassword(userId: string, input: UpdatePasswordInput): Promise<void> {
    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

    const matches = await this.passwordService.compare(input.currentPassword, user.passwordHash);
    if (!matches)
      throw new AppError("Current password is incorrect", 400, "INVALID_CURRENT_PASSWORD");

    const repeatsCurrent = await this.passwordService.compare(input.newPassword, user.passwordHash);
    if (repeatsCurrent)
      throw new AppError("New password must be different", 400, "PASSWORD_UNCHANGED");

    await this.database.user.update({
      where: { id: userId },
      data: {
        passwordHash: await this.passwordService.hash(input.newPassword),
        sessionVersion: { increment: 1 },
      },
    });
  }
}
