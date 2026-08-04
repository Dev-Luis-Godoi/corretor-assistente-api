import type { PrismaClient } from "@/generated/prisma/client.js";
import { Prisma } from "@/generated/prisma/client.js";

import {
  ContactHasRelationsError,
  ContactNotFoundError,
  ContactPhoneAlreadyInUseError,
} from "./contact.errors.js";
import type {
  CreateContactInput,
  ListContactsQuery,
  UpdateContactInput,
} from "./contact.schema.js";

const contactSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  avatarUrl: true,
  origin: true,
  consentStatus: true,
  consentAt: true,
  consentSource: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ContactSelect;

type ContactView = Prisma.ContactGetPayload<{ select: typeof contactSelect }>;

interface ContactList {
  data: ContactView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ContactService {
  constructor(private readonly database: PrismaClient) {}

  async create(organizationId: string, input: CreateContactInput): Promise<ContactView> {
    await this.ensurePhoneIsAvailable(organizationId, input.phone);

    try {
      return await this.database.contact.create({
        data: {
          ...input,
          organizationId,
        },
        select: contactSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ContactPhoneAlreadyInUseError();
      }

      throw error;
    }
  }

  async list(organizationId: string, query: ListContactsQuery): Promise<ContactList> {
    const where = {
      organizationId,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { phone: { contains: query.search } },
            { email: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
          ]
        : undefined,
    } satisfies Prisma.ContactWhereInput;

    const [contacts, total] = await this.database.$transaction([
      this.database.contact.findMany({
        where,
        select: contactSelect,
        orderBy: [{ name: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.contact.count({ where }),
    ]);

    return {
      data: contacts,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getById(organizationId: string, contactId: string): Promise<ContactView> {
    const contact = await this.database.contact.findFirst({
      where: { id: contactId, organizationId },
      select: contactSelect,
    });

    if (!contact) {
      throw new ContactNotFoundError();
    }

    return contact;
  }

  async update(
    organizationId: string,
    contactId: string,
    input: UpdateContactInput,
  ): Promise<ContactView> {
    const contact = await this.database.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, phone: true },
    });

    if (!contact) {
      throw new ContactNotFoundError();
    }

    if (input.phone && input.phone !== contact.phone) {
      await this.ensurePhoneIsAvailable(organizationId, input.phone, contact.id);
    }

    try {
      return await this.database.contact.update({
        where: { id: contact.id },
        data: input,
        select: contactSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ContactPhoneAlreadyInUseError();
      }

      throw error;
    }
  }

  async delete(organizationId: string, contactId: string): Promise<void> {
    const contact = await this.database.contact.findFirst({
      where: { id: contactId, organizationId },
      select: {
        id: true,
        _count: {
          select: {
            leads: true,
            conversations: true,
          },
        },
      },
    });

    if (!contact) {
      throw new ContactNotFoundError();
    }

    if (contact._count.leads > 0 || contact._count.conversations > 0) {
      throw new ContactHasRelationsError();
    }

    await this.database.contact.delete({ where: { id: contact.id } });
  }

  private async ensurePhoneIsAvailable(
    organizationId: string,
    phone: string,
    ignoredContactId?: string,
  ) {
    const contact = await this.database.contact.findUnique({
      where: {
        organizationId_phone: {
          organizationId,
          phone,
        },
      },
      select: { id: true },
    });

    if (contact && contact.id !== ignoredContactId) {
      throw new ContactPhoneAlreadyInUseError();
    }
  }
}
