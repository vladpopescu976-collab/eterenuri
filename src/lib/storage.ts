import { S3Client } from "@aws-sdk/client-s3";

// Bucket-ul Prisma Compute e S3-compatibil (Tigris), deci folosim clientul S3.
export const storageBucket = process.env.STORAGE_BUCKET ?? "";

export const isStorageConfigured =
  !!process.env.STORAGE_ENDPOINT &&
  !!storageBucket &&
  !!process.env.STORAGE_ACCESS_KEY_ID &&
  !!process.env.STORAGE_SECRET_ACCESS_KEY;

export const storageClient = isStorageConfigured
  ? new S3Client({
      region: "auto",
      endpoint: process.env.STORAGE_ENDPOINT,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
