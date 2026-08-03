import { describe, expect, it, vi } from "vitest";
import { UserService } from "./service.js";

describe("UserService", () => {
  it("updates only the authenticated user profile", async () => {
    const update = vi.fn().mockResolvedValue({ id: "user-1", name: "Luis", email: "luis@example.com" });
    const service = new UserService({ user: { update } } as never, {} as never);

    await service.updateProfile("user-1", { name: "Luis", email: "luis@example.com" });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user-1" },
      data: { name: "Luis", email: "luis@example.com" },
    }));
  });

  it("requires the current password before changing it", async () => {
    const update = vi.fn();
    const compare = vi.fn().mockResolvedValue(false);
    const service = new UserService(
      { user: { findUnique: vi.fn().mockResolvedValue({ passwordHash: "stored" }), update } } as never,
      { compare, hash: vi.fn() } as never,
    );

    await expect(service.updatePassword("user-1", {
      currentPassword: "wrong-password",
      newPassword: "new-password",
    })).rejects.toMatchObject({ code: "INVALID_CURRENT_PASSWORD" });
    expect(update).not.toHaveBeenCalled();
  });

  it("hashes a new password after validating the current one", async () => {
    const update = vi.fn().mockResolvedValue({});
    const compare = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const hash = vi.fn().mockResolvedValue("new-hash");
    const service = new UserService(
      { user: { findUnique: vi.fn().mockResolvedValue({ passwordHash: "stored" }), update } } as never,
      { compare, hash } as never,
    );

    await service.updatePassword("user-1", {
      currentPassword: "current-password",
      newPassword: "new-password",
    });

    expect(hash).toHaveBeenCalledWith("new-password");
    expect(update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { passwordHash: "new-hash" } });
  });
});
