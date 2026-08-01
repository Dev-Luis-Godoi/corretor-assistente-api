import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client.js";

import { createContactSchema } from "./contact.schema.js";
import { ContactService } from "./contact.service.js";

const contactFindUnique = vi.fn();
const contactFindFirst = vi.fn();
const contactFindMany = vi.fn();
const contactCount = vi.fn();
const contactCreate = vi.fn();
const contactUpdate = vi.fn();
const contactDelete = vi.fn();
const transaction = vi.fn();

const database = {
  contact: {
    findUnique: contactFindUnique,
    findFirst: contactFindFirst,
    findMany: contactFindMany,
    count: contactCount,
    create: contactCreate,
    update: contactUpdate,
    delete: contactDelete,
  },
  $transaction: transaction,
} as unknown as PrismaClient;

const organizationId = "00000000-0000-4000-8000-000000000001";
const contactId = "00000000-0000-4000-8000-000000000002";

function contact() {
  return {
    id: contactId,
    name: "Maria",
    phone: "+5511999999999",
    email: "maria@example.com",
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("ContactService tenant isolation", () => {
  const contactService = new ContactService(database);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects organizationId supplied by the frontend", () => {
    expect(
      createContactSchema.safeParse({
        phone: "+5511999999999",
        organizationId,
      }).success,
    ).toBe(false);
  });

  it("normalizes and validates phone numbers", () => {
    const result = createContactSchema.parse({ phone: "+55 (11) 99999-9999" });

    expect(result.phone).toBe("+5511999999999");
  });

  it("always creates contacts in the authenticated organization", async () => {
    contactFindUnique.mockResolvedValue(null);
    contactCreate.mockResolvedValue(contact());

    await contactService.create(organizationId, { phone: "+5511999999999" });

    expect(JSON.stringify(contactCreate.mock.calls)).toContain(organizationId);
    expect(JSON.stringify(contactCreate.mock.calls)).toContain("+5511999999999");
  });

  it("lists only contacts from the authenticated organization", async () => {
    contactFindMany.mockReturnValue(Promise.resolve([contact()]));
    contactCount.mockReturnValue(Promise.resolve(1));
    transaction.mockResolvedValue([[contact()], 1]);

    const result = await contactService.list(organizationId, { page: 1, limit: 20 });

    expect(result.meta.total).toBe(1);
    expect(JSON.stringify(contactFindMany.mock.calls)).toContain(organizationId);
  });

  it("does not return or update a contact from another organization", async () => {
    contactFindFirst.mockResolvedValue(null);

    await expect(contactService.getById(organizationId, contactId)).rejects.toMatchObject({
      code: "CONTACT_NOT_FOUND",
    });
    await expect(
      contactService.update(organizationId, contactId, { name: "Updated" }),
    ).rejects.toMatchObject({ code: "CONTACT_NOT_FOUND" });

    expect(contactUpdate).not.toHaveBeenCalled();
    expect(JSON.stringify(contactFindFirst.mock.calls)).toContain(organizationId);
  });

  it("does not delete contacts with leads or conversations", async () => {
    contactFindFirst.mockResolvedValue({
      id: contactId,
      _count: { leads: 1, conversations: 0 },
    });

    await expect(contactService.delete(organizationId, contactId)).rejects.toMatchObject({
      code: "CONTACT_HAS_RELATIONS",
    });

    expect(contactDelete).not.toHaveBeenCalled();
  });
});
