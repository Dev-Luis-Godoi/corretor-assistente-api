import type { Prisma, PrismaClient } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";
import {
  propertyPhotoLimits,
  type ObjectStorageService,
} from "@/shared/storage/object-storage.service.js";

import type {
  CreatePropertyInput,
  ListPropertiesQuery,
  PreparePropertyPhotoInput,
  PreparePropertyAuthorizationDocumentInput,
  UpdatePropertyInput,
} from "./property.schemas.js";

const propertySelect = {
  id: true,
  title: true,
  reference: true,
  description: true,
  type: true,
  purpose: true,
  status: true,
  price: true,
  condominiumFee: true,
  propertyTax: true,
  areaM2: true,
  bedrooms: true,
  suites: true,
  bathrooms: true,
  parkingSpots: true,
  address: true,
  neighborhood: true,
  city: true,
  state: true,
  zipCode: true,
  amenities: true,
  featured: true,
  authorizationStatus: true,
  authorizationDate: true,
  authorizationNotes: true,
  exclusive: true,
  exclusivityStartAt: true,
  exclusivityEndAt: true,
  authorizationDocumentName: true,
  authorizationDocumentObjectKey: true,
  authorizationDocumentMimeType: true,
  authorizationDocumentSizeBytes: true,
  owner: { select: { id: true, name: true } },
  photos: {
    select: {
      id: true,
      url: true,
      position: true,
      mimeType: true,
      sizeBytes: true,
      objectKey: true,
      createdAt: true,
    },
    orderBy: [{ position: "asc" as const }, { createdAt: "asc" as const }],
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PropertySelect;

export class PropertyService {
  constructor(
    private readonly database: PrismaClient,
    private readonly storage: ObjectStorageService,
  ) {}

  storageStatus() {
    return {
      configured: this.storage.isConfigured(),
      maxPhotos: propertyPhotoLimits.maxPhotos,
      maxBytes: propertyPhotoLimits.maxBytes,
    };
  }

  private async serializeProperty<T extends {
    photos: Array<{ objectKey: string; url: string }>;
    authorizationDocumentObjectKey: string | null;
    authorizationDocumentName: string | null;
    authorizationDocumentMimeType: string | null;
    authorizationDocumentSizeBytes: number | null;
  }>(
    property: T,
  ) {
    const { authorizationDocumentObjectKey, authorizationDocumentName, authorizationDocumentMimeType, authorizationDocumentSizeBytes, ...visible } = property;
    return {
      ...visible,
      authorizationDocument: authorizationDocumentObjectKey ? {
        name: authorizationDocumentName,
        mimeType: authorizationDocumentMimeType,
        sizeBytes: authorizationDocumentSizeBytes,
        url: await this.storage.createPrivateReadUrl(authorizationDocumentObjectKey),
      } : null,
      photos: await Promise.all(
        property.photos.map(async ({ objectKey, ...photo }) => ({
          ...photo,
          url: this.storage.isConfigured()
            ? await this.storage.createReadUrl(objectKey)
            : photo.url,
        })),
      ),
    };
  }

  async list(organizationId: string, query: ListPropertiesQuery) {
    const where: Prisma.PropertyWhereInput = {
      organizationId,
      status: query.status,
      type: query.type,
      purpose: query.purpose,
      ownerId: query.ownerId,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: "insensitive" } },
            { reference: { contains: query.search, mode: "insensitive" } },
            { city: { contains: query.search, mode: "insensitive" } },
            { neighborhood: { contains: query.search, mode: "insensitive" } },
            { address: { contains: query.search, mode: "insensitive" } },
          ]
        : undefined,
    };
    const [data, total] = await this.database.$transaction([
      this.database.property.findMany({
        where,
        select: propertySelect,
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.database.property.count({ where }),
    ]);
    return {
      data: await Promise.all(data.map((property) => this.serializeProperty(property))),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getById(organizationId: string, propertyId: string) {
    const property = await this.database.property.findFirst({
      where: { id: propertyId, organizationId },
      select: propertySelect,
    });
    if (!property) throw new AppError("Property not found", 404, "PROPERTY_NOT_FOUND");
    return this.serializeProperty(property);
  }

  async create(organizationId: string, input: CreatePropertyInput) {
    await this.validateOwner(organizationId, input.ownerId);
    const property = await this.database.property.create({
      data: { ...input, organizationId },
      select: propertySelect,
    });
    return this.serializeProperty(property);
  }

  async update(organizationId: string, propertyId: string, input: UpdatePropertyInput) {
    await this.validateOwner(organizationId, input.ownerId);
    const property = await this.database.property.findFirst({
      where: { id: propertyId, organizationId },
      select: { id: true },
    });
    if (!property) throw new AppError("Property not found", 404, "PROPERTY_NOT_FOUND");
    const updated = await this.database.property.update({
      where: { id: property.id },
      data: input,
      select: propertySelect,
    });
    return this.serializeProperty(updated);
  }

  private async validateOwner(organizationId: string, ownerId?: string | null) {
    if (!ownerId) return;
    const owner = await this.database.owner.findFirst({
      where: { id: ownerId, organizationId },
      select: { id: true },
    });
    if (!owner) throw new AppError("Owner not found", 404, "OWNER_NOT_FOUND");
  }

  async preparePhotoUpload(
    organizationId: string,
    propertyId: string,
    input: PreparePropertyPhotoInput,
  ) {
    const property = await this.database.property.findFirst({
      where: { id: propertyId, organizationId },
      select: { id: true, _count: { select: { photos: true } } },
    });
    if (!property) throw new AppError("Property not found", 404, "PROPERTY_NOT_FOUND");
    if (property._count.photos >= propertyPhotoLimits.maxPhotos) {
      throw new AppError("Photo limit reached", 400, "PROPERTY_PHOTO_LIMIT_REACHED");
    }
    return this.storage.createPropertyPhotoUpload({
      organizationId,
      propertyId,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });
  }

  async prepareAuthorizationDocumentUpload(
    organizationId: string,
    propertyId: string,
    input: PreparePropertyAuthorizationDocumentInput,
  ) {
    const property = await this.database.property.findFirst({
      where: { id: propertyId, organizationId },
      select: { id: true },
    });
    if (!property) throw new AppError("Property not found", 404, "PROPERTY_NOT_FOUND");
    return this.storage.createPropertyAuthorizationUpload({ organizationId, propertyId, ...input });
  }

  async confirmAuthorizationDocument(
    organizationId: string,
    propertyId: string,
    input: { objectKey: string; fileName: string },
  ) {
    const expectedPrefix = `properties/${organizationId}/${propertyId}/authorization/`;
    if (!input.objectKey.startsWith(expectedPrefix)) {
      throw new AppError("Invalid document key", 400, "AUTHORIZATION_DOCUMENT_KEY_INVALID");
    }
    const property = await this.database.property.findFirst({
      where: { id: propertyId, organizationId },
      select: { id: true, authorizationDocumentObjectKey: true },
    });
    if (!property) throw new AppError("Property not found", 404, "PROPERTY_NOT_FOUND");
    const uploaded = await this.storage.inspectPropertyAuthorizationDocument(input.objectKey);
    await this.database.property.update({
      where: { id: property.id },
      data: {
        authorizationDocumentName: input.fileName,
        authorizationDocumentObjectKey: input.objectKey,
        authorizationDocumentMimeType: uploaded.mimeType,
        authorizationDocumentSizeBytes: uploaded.sizeBytes,
      },
    });
    if (property.authorizationDocumentObjectKey && property.authorizationDocumentObjectKey !== input.objectKey) {
      await this.storage.deleteObject(property.authorizationDocumentObjectKey);
    }
    return this.getById(organizationId, propertyId);
  }

  async removeAuthorizationDocument(organizationId: string, propertyId: string) {
    const property = await this.database.property.findFirst({
      where: { id: propertyId, organizationId },
      select: { id: true, authorizationDocumentObjectKey: true },
    });
    if (!property) throw new AppError("Property not found", 404, "PROPERTY_NOT_FOUND");
    if (property.authorizationDocumentObjectKey) {
      await this.storage.deleteObject(property.authorizationDocumentObjectKey);
    }
    await this.database.property.update({
      where: { id: property.id },
      data: {
        authorizationDocumentName: null,
        authorizationDocumentObjectKey: null,
        authorizationDocumentMimeType: null,
        authorizationDocumentSizeBytes: null,
      },
    });
    return this.getById(organizationId, propertyId);
  }

  async confirmPhoto(organizationId: string, propertyId: string, objectKey: string) {
    const expectedPrefix = `properties/${organizationId}/${propertyId}/`;
    if (!objectKey.startsWith(expectedPrefix)) {
      throw new AppError("Invalid photo key", 400, "PROPERTY_PHOTO_KEY_INVALID");
    }
    const property = await this.database.property.findFirst({
      where: { id: propertyId, organizationId },
      select: { id: true, _count: { select: { photos: true } } },
    });
    if (!property) throw new AppError("Property not found", 404, "PROPERTY_NOT_FOUND");

    const existing = await this.database.propertyPhoto.findUnique({
      where: { objectKey },
      select: { id: true },
    });
    if (existing) return this.getById(organizationId, propertyId);
    if (property._count.photos >= propertyPhotoLimits.maxPhotos) {
      await this.storage.deleteObject(objectKey);
      throw new AppError("Photo limit reached", 400, "PROPERTY_PHOTO_LIMIT_REACHED");
    }

    const uploaded = await this.storage.inspectPropertyPhoto(objectKey);
    const lastPhoto = await this.database.propertyPhoto.findFirst({
      where: { propertyId },
      select: { position: true },
      orderBy: { position: "desc" },
    });
    try {
      await this.database.propertyPhoto.create({
        data: {
          propertyId,
          objectKey,
          position: (lastPhoto?.position ?? -1) + 1,
          ...uploaded,
        },
      });
    } catch (caught) {
      await this.storage.deleteObject(objectKey);
      throw caught;
    }
    return this.getById(organizationId, propertyId);
  }

  async removePhoto(organizationId: string, propertyId: string, photoId: string) {
    const photo = await this.database.propertyPhoto.findFirst({
      where: { id: photoId, propertyId, property: { organizationId } },
      select: { id: true, objectKey: true },
    });
    if (!photo) throw new AppError("Photo not found", 404, "PROPERTY_PHOTO_NOT_FOUND");
    await this.storage.deleteObject(photo.objectKey);
    await this.database.propertyPhoto.delete({ where: { id: photo.id } });
    return this.getById(organizationId, propertyId);
  }

  async setCover(organizationId: string, propertyId: string, photoId: string) {
    const property = await this.database.property.findFirst({
      where: { id: propertyId, organizationId },
      select: {
        id: true,
        photos: { select: { id: true }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
      },
    });
    if (!property) throw new AppError("Property not found", 404, "PROPERTY_NOT_FOUND");
    if (!property.photos.some((photo) => photo.id === photoId)) {
      throw new AppError("Photo not found", 404, "PROPERTY_PHOTO_NOT_FOUND");
    }
    const ordered = [
      photoId,
      ...property.photos.filter((photo) => photo.id !== photoId).map((photo) => photo.id),
    ];
    await this.database.$transaction(
      ordered.map((id, position) =>
        this.database.propertyPhoto.update({ where: { id }, data: { position } }),
      ),
    );
    return this.getById(organizationId, propertyId);
  }
}
