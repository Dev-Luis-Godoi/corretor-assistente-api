import { describe, expect, it, vi } from "vitest";
import { OrganizationService } from "./service.js";

describe("OrganizationService", () => {
  it("loads the authenticated organization", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "org-1", name: "Horizonte" });
    const service = new OrganizationService({ organization: { findUnique } } as never);

    await service.get("org-1");

    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "org-1" } }));
  });

  it("updates only the authenticated organization", async () => {
    const update = vi.fn().mockResolvedValue({ id: "org-1", name: "Novo nome" });
    const service = new OrganizationService({ organization: { update } } as never);

    await service.update("org-1", { name: "Novo nome" });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "org-1" },
      data: { name: "Novo nome" },
    }));
  });
});
