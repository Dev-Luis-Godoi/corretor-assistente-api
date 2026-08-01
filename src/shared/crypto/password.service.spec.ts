import { describe, expect, it } from "vitest";

import { PasswordService } from "./password.service.js";

describe("PasswordService", () => {
  const passwordService = new PasswordService(4);

  it("hashes and compares a password", async () => {
    const hash = await passwordService.hash("strong-password");

    expect(hash).not.toBe("strong-password");
    await expect(passwordService.compare("strong-password", hash)).resolves.toBe(true);
    await expect(passwordService.compare("wrong-password", hash)).resolves.toBe(false);
  });
});
