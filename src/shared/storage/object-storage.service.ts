import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/config/env.js";
import { AppError } from "@/shared/errors/app-error.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const allowedDocumentMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const documentExtensionByMimeType: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const propertyPhotoLimits = {
  maxPhotos: 10,
  maxBytes: 6 * 1024 * 1024,
};
export const propertyAuthorizationDocumentLimits = { maxBytes: 10 * 1024 * 1024 };

interface StorageConfiguration {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl?: string;
  forcePathStyle: boolean;
}

function resolveConfiguration(): StorageConfiguration | null {
  if (
    env.OBJECT_STORAGE_ENDPOINT &&
    env.OBJECT_STORAGE_ACCESS_KEY_ID &&
    env.OBJECT_STORAGE_SECRET_ACCESS_KEY &&
    env.OBJECT_STORAGE_BUCKET
  ) {
    return {
      endpoint: env.OBJECT_STORAGE_ENDPOINT,
      region: env.OBJECT_STORAGE_REGION,
      accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
      bucket: env.OBJECT_STORAGE_BUCKET,
      publicBaseUrl: env.OBJECT_STORAGE_PUBLIC_BASE_URL,
      forcePathStyle: env.OBJECT_STORAGE_FORCE_PATH_STYLE,
    };
  }

  if (
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET &&
    env.R2_PUBLIC_BASE_URL
  ) {
    return {
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: "auto",
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET,
      publicBaseUrl: env.R2_PUBLIC_BASE_URL,
      forcePathStyle: false,
    };
  }

  return null;
}

export class ObjectStorageService {
  private readonly client: S3Client | null;
  private readonly configuration: StorageConfiguration | null;

  constructor() {
    this.configuration = resolveConfiguration();
    this.client = this.configuration
      ? new S3Client({
          region: this.configuration.region,
          endpoint: this.configuration.endpoint,
          forcePathStyle: this.configuration.forcePathStyle,
          credentials: {
            accessKeyId: this.configuration.accessKeyId,
            secretAccessKey: this.configuration.secretAccessKey,
          },
        })
      : null;
  }

  isConfigured() {
    return Boolean(this.client && this.configuration);
  }

  async createPropertyPhotoUpload(input: {
    organizationId: string;
    propertyId: string;
    mimeType: string;
    sizeBytes: number;
  }) {
    const { client, bucket } = this.requireConfiguration();
    if (!allowedMimeTypes.has(input.mimeType)) {
      throw new AppError("Unsupported image format", 400, "PHOTO_FORMAT_NOT_ALLOWED");
    }
    if (input.sizeBytes > propertyPhotoLimits.maxBytes) {
      throw new AppError("Image is too large", 400, "PHOTO_TOO_LARGE");
    }

    const extension = extensionByMimeType[input.mimeType] ?? "webp";
    const objectKey = `properties/${input.organizationId}/${input.propertyId}/${randomUUID()}.${extension}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: input.mimeType,
      ContentLength: input.sizeBytes,
      CacheControl: "public, max-age=31536000, immutable",
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    return { objectKey, uploadUrl, expiresInSeconds: 300 };
  }

  async createReadUrl(objectKey: string) {
    const { client, bucket, publicBaseUrl } = this.requireConfiguration();
    if (publicBaseUrl) {
      const encodedKey = objectKey.split("/").map(encodeURIComponent).join("/");
      return `${publicBaseUrl.replace(/\/$/, "")}/${encodedKey}`;
    }
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: objectKey }), {
      expiresIn: 3600,
    });
  }

  async createPrivateReadUrl(objectKey: string) {
    const { client, bucket } = this.requireConfiguration();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: objectKey }), {
      expiresIn: 900,
    });
  }

  async createPropertyAuthorizationUpload(input: {
    organizationId: string;
    propertyId: string;
    mimeType: string;
    sizeBytes: number;
  }) {
    const { client, bucket } = this.requireConfiguration();
    if (!allowedDocumentMimeTypes.has(input.mimeType)) {
      throw new AppError("Unsupported document format", 400, "AUTHORIZATION_DOCUMENT_FORMAT_NOT_ALLOWED");
    }
    if (input.sizeBytes > propertyAuthorizationDocumentLimits.maxBytes) {
      throw new AppError("Document is too large", 400, "AUTHORIZATION_DOCUMENT_TOO_LARGE");
    }
    const extension = documentExtensionByMimeType[input.mimeType] ?? "pdf";
    const objectKey = `properties/${input.organizationId}/${input.propertyId}/authorization/${randomUUID()}.${extension}`;
    const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: input.mimeType,
      ContentLength: input.sizeBytes,
      CacheControl: "private, no-store",
    }), { expiresIn: 300 });
    return { objectKey, uploadUrl, expiresInSeconds: 300 };
  }

  async inspectPropertyAuthorizationDocument(objectKey: string) {
    const { client, bucket } = this.requireConfiguration();
    try {
      const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
      const mimeType = object.ContentType ?? "";
      const sizeBytes = object.ContentLength ?? 0;
      if (!allowedDocumentMimeTypes.has(mimeType) || sizeBytes <= 0) {
        throw new AppError("Invalid uploaded document", 400, "AUTHORIZATION_DOCUMENT_INVALID");
      }
      if (sizeBytes > propertyAuthorizationDocumentLimits.maxBytes) {
        await this.deleteObject(objectKey);
        throw new AppError("Document is too large", 400, "AUTHORIZATION_DOCUMENT_TOO_LARGE");
      }
      return { mimeType, sizeBytes };
    } catch (caught) {
      if (caught instanceof AppError) throw caught;
      throw new AppError("Uploaded document was not found", 400, "AUTHORIZATION_DOCUMENT_NOT_FOUND");
    }
  }

  async inspectPropertyPhoto(objectKey: string) {
    const { client, bucket } = this.requireConfiguration();
    try {
      const object = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: objectKey }),
      );
      const mimeType = object.ContentType ?? "";
      const sizeBytes = object.ContentLength ?? 0;
      if (!allowedMimeTypes.has(mimeType) || sizeBytes <= 0) {
        throw new AppError("Invalid uploaded image", 400, "PHOTO_UPLOAD_INVALID");
      }
      if (sizeBytes > propertyPhotoLimits.maxBytes) {
        await this.deleteObject(objectKey);
        throw new AppError("Image is too large", 400, "PHOTO_TOO_LARGE");
      }

      return {
        url: await this.createReadUrl(objectKey),
        mimeType,
        sizeBytes,
      };
    } catch (caught) {
      if (caught instanceof AppError) throw caught;
      throw new AppError("Uploaded image was not found", 400, "PHOTO_UPLOAD_NOT_FOUND");
    }
  }

  async deleteObject(objectKey: string) {
    if (!this.client || !this.configuration) return;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.configuration.bucket, Key: objectKey }),
    );
  }

  private requireConfiguration() {
    if (!this.client || !this.configuration) {
      throw new AppError(
        "Property photo storage is not configured",
        503,
        "PROPERTY_STORAGE_NOT_CONFIGURED",
      );
    }
    return {
      client: this.client,
      bucket: this.configuration.bucket,
      publicBaseUrl: this.configuration.publicBaseUrl,
    };
  }
}
