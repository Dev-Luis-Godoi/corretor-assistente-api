import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const requiredVariables = [
  "APP_URL",
  "OBJECT_STORAGE_ENDPOINT",
  "OBJECT_STORAGE_REGION",
  "OBJECT_STORAGE_ACCESS_KEY_ID",
  "OBJECT_STORAGE_SECRET_ACCESS_KEY",
  "OBJECT_STORAGE_BUCKET",
] as const;

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
}

const appUrl = new URL(process.env.APP_URL!).origin;
const client = new S3Client({
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT!,
  region: process.env.OBJECT_STORAGE_REGION!,
  forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY!,
  },
});

await client.send(
  new PutBucketCorsCommand({
    Bucket: process.env.OBJECT_STORAGE_BUCKET!,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: [appUrl],
          AllowedMethods: ["GET", "HEAD", "PUT"],
          AllowedHeaders: ["content-type"],
          ExposeHeaders: ["etag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

console.info(`Object storage CORS configured for ${appUrl}`);
