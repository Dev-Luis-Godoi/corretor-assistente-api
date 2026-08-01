import type { PrismaClient } from "@/generated/prisma/client.js";
import { Prisma, UserRole } from "@/generated/prisma/client.js";
import type { PasswordService } from "@/shared/crypto/password.service.js";
import { AppError } from "@/shared/errors/app-error.js";

import type { AuthUser } from "./auth.types.js";
import type { LoginInput, RegisterInput } from "./schemas.js";
import { getDefaultPipelineStages } from "@/modules/pipelines/default-pipeline-stages.js";

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.UserSelect;

export class AuthService {
  constructor(
    private readonly database: PrismaClient,
    private readonly passwordService: PasswordService,
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
              name: input.organizationName,
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

    const passwordMatches = await this.passwordService.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
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

    return user;
  }
}
