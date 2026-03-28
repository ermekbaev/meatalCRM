import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.S3_ENDPOINT || !process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY || !process.env.S3_BUCKET) {
  // В dev-режиме без S3 просто предупреждаем, не падаем
  if (process.env.NODE_ENV === "production") {
    throw new Error("S3 environment variables are not set (S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET)");
  }
}

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "https://storage.yandexcloud.net",
  region: process.env.S3_REGION ?? "ru-central1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
  forcePathStyle: false, // Yandex использует virtual-hosted style
});

export const S3_BUCKET = process.env.S3_BUCKET ?? "";
