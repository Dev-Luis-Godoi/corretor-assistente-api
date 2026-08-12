import type { Prisma, PrismaClient } from "@/generated/prisma/client.js";
import { AppError } from "@/shared/errors/app-error.js";
import {
  propertyPhotoLimits,
  type R2ObjectStorageService,
} from "@/shared/storage/r2-object-storage.service.js";

import type {
  CreatePropertyInput,
  ListPropertiesQuery,
  PreparePropertyPhotoInput,
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
  photos: {
    select: {
      id: true,
      url: true,
      position: true,
      mimeType: true,
      sizeBytes: true,
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
    private readonly storage: R2ObjectStorageService,
  ) {}

  storageStatus() {
    return {
      configured: this.storage.isConfigured(),
      maxPhotos: propertyPhotoLimits.maxPhotos,
      maxBytes: propertyPhotoLimits.maxBytes,
    };
  }

  async list(organizationId: string, query: ListPropertiesQuery) {
    const where: Prisma.PropertyWhereInput = {
      organizationId,
      status: query.status,
      type: query.type,
      purpose: query.purpose,
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
      data,
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
    return property;
  }

  create(organizationId: string, input: CreatePropertyInput) {
    return this.database.property.create({
      data: { ...input, organizationId },
      select: propertySelect,
    });
  }

  async update(organizationId: string, propertyId: string, input: UpdatePropertyInput) {
    const property = await this.database.property.findFirst({
      where: { id: propertyId, organizationId },
      select: { id: true },
    });
    if (!property) throw new AppError("Property not found", 404, "PROPERTY_NOT_FOUND");
    return this.database.property.update({
      where: { id: property.id },
      data: input,
      select: propertySelect,
    });
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
