import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET } from "./s3";
import { randomUUID } from "crypto";

// ─── Загрузка файла ───────────────────────────────────────────────────────────

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: "requests" | "tasks" | "company"
): Promise<{ key: string; filename: string; originalName: string }> {
  const ext = originalName.split(".").pop() ?? "bin";
  const uuid = randomUUID();
  const key = `${folder}/${uuid}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType || "application/octet-stream",
    })
  );

  return { key, filename: key, originalName };
}

// ─── Удаление файла ───────────────────────────────────────────────────────────

export async function deleteFile(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  } catch {
    // Не падаем если файла уже нет
  }
}

// ─── Presigned URL для скачивания (15 минут) ──────────────────────────────────

export async function getDownloadUrl(
  key: string,
  originalName?: string,
  expiresInSeconds = 900
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    // Подсказываем браузеру имя файла при скачивании
    ResponseContentDisposition: originalName
      ? `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`
      : undefined,
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

// ─── Presigned URL для просмотра (inline, для изображений) ───────────────────

export async function getViewUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

// ─── Проксирование файла (читаем на сервере, отдаём клиенту) ─────────────────

export async function getFileStream(key: string): Promise<{ body: ReadableStream; contentType: string }> {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  const response = await s3.send(command);
  const contentType = response.ContentType ?? "application/octet-stream";
  // AWS SDK возвращает SdkStreamMixin, приводим к web ReadableStream
  const body = response.Body!.transformToWebStream();
  return { body, contentType };
}
