import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
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

export const propertyPhotoLimits = {
  maxPhotos: 10,
  maxBytes: 6 * 1024 * 1024,
};

export class R2ObjectStorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string | null;
  private readonly publicBaseUrl: string | null;

  constructor() {
    const configured =
      env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET &&
      env.R2_PUBLIC_BASE_URL;

    this.bucket = env.R2_BUCKET ?? null;
    this.publicBaseUrl = env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? null;
    this.client = configured
      ? new S3Client({
          region: "auto",
          endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID!,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
          },
        })
      : null;
  }

  isConfigured() {
    return Boolean(this.client && this.bucket && this.publicBaseUrl);
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

  async inspectPropertyPhoto(objectKey: string) {
    const { client, bucket, publicBaseUrl } = this.requireConfiguration();
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

      const encodedKey = objectKey.split("/").map(encodeURIComponent).join("/");
      return {
        url: `${publicBaseUrl}/${encodedKey}`,
        mimeType,
        sizeBytes,
      };
    } catch (caught) {
      if (caught instanceof AppError) throw caught;
      throw new AppError("Uploaded image was not found", 400, "PHOTO_UPLOAD_NOT_FOUND");
    }
  }

  async deleteObject(objectKey: string) {
    if (!this.client || !this.bucket) return;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }

  private requireConfiguration() {
    if (!this.client || !this.bucket || !this.publicBaseUrl) {
      throw new AppError(
        "Property photo storage is not configured",
        503,
        "PROPERTY_STORAGE_NOT_CONFIGURED",
      );
    }
    return {
      client: this.client,
      bucket: this.bucket,
      publicBaseUrl: this.publicBaseUrl,
    };
  }
}
