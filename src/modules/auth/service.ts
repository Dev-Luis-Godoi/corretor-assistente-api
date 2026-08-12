import type { PrismaClient } from "@/generated/prisma/client.js";
import { AccountStatus, Prisma, UserRole } from "@/generated/prisma/client.js";
import type { PasswordService } from "@/shared/crypto/password.service.js";
import { AppError } from "@/shared/errors/app-error.js";
import type { ResendEmailService } from "@/shared/email/resend-email.service.js";
import { createHash, randomBytes } from "node:crypto";

import type { AuthUser } from "./auth.types.js";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./schemas.js";
import { getDefaultPipelineStages } from "@/modules/pipelines/default-pipeline-stages.js";

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  sessionVersion: true,
  organization: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
} satisfies Prisma.UserSelect;

export class AuthService {
  constructor(
    private readonly database: PrismaClient,
    private readonly passwordService: PasswordService,
    private readonly emailService?: ResendEmailService,
  ) {}

  async register(input: RegisterInput): Promise<AuthUser> {
    const existingUser = await this.database.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new AppError("Email is already in use", 409, "EMAIL_ALREADY_IN_USE");
    }

    const passwordHash = await this.passwordService.hash(input.password);

    try {
      return await this.database.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: UserRole.OWNER,
          organization: {
            create: {
              name: `${input.name} · Meu espaço`,
              status: AccountStatus.TRIAL,
              trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
              stages: {
                create: getDefaultPipelineStages(),
              },
            },
          },
        },
        select: authUserSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Email is already in use", 409, "EMAIL_ALREADY_IN_USE");
      }

      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthUser> {
    const user = await this.database.user.findUnique({
      where: { email: input.email },
      select: {
        ...authUserSelect,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    this.assertAccountAvailable(user.organization.status);

    const passwordMatches = await this.passwordService.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    await this.database.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
      organization: user.organization,
    };
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: authUserSelect,
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    this.assertAccountAvailable(user.organization.status);

    return user;
  }

  async requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
    const user = await this.database.user.findUnique({
      where: { email: input.email },
      select: { id: true, name: true, email: true },
    });
    if (!user) return;
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [deleted, resetToken] = await this.database.$transaction([
      this.database.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      this.database.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60_000) },
      }),
    ]);
    void deleted;
    try {
      if (!this.emailService) throw new Error("Email service is not configured");
      await this.emailService.sendPasswordReset({
        email: user.email,
        name: user.name,
        token,
        idempotencyKey: `password-reset-${resetToken.id}`,
      });
    } catch {
      // Mantém a mesma resposta para contas existentes e inexistentes, sem
      // registrar endereço, token ou resposta potencialmente sensível do provedor.
      console.error("Password reset email delivery failed");
    }
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const resetToken = await this.database.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date())
      throw new AppError("Invalid or expired reset token", 400, "INVALID_RESET_TOKEN");
    const passwordHash = await this.passwordService.hash(input.password);
    await this.database.$transaction([
      this.database.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      }),
      this.database.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  private assertAccountAvailable(status: AccountStatus) {
    if (status === AccountStatus.SUSPENDED)
      throw new AppError("Account is suspended", 403, "ACCOUNT_SUSPENDED");
    if (status === AccountStatus.CANCELED)
      throw new AppError("Account is canceled", 403, "ACCOUNT_CANCELED");
  }
}
