import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET } from "./s3";
import { randomUUID } from "crypto";

export type Folder = "requests" | "tasks" | "company" | "avatars" | "portal";

// ─── Загрузка файла буфером (для мелких файлов: аватары, логотипы) ────────────

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: Folder
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

// ─── Presigned PUT (клиент льёт файл напрямую в S3, минуя приложение) ────────
// Используется для крупных файлов (чертежи, документы). Сервер только подписывает
// URL и не видит тело загрузки — RAM приложения не страдает от размера файла.

export function buildObjectKey(folder: Folder, originalName: string): string {
  const ext = originalName.split(".").pop() ?? "bin";
  return `${folder}/${randomUUID()}.${ext}`;
}

export async function getUploadUrl(
  key: string,
  mimeType: string,
  expiresInSeconds = 900
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: mimeType || "application/octet-stream",
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

// HEAD объект — нужен после загрузки, чтобы получить реальный размер из S3
// (нельзя доверять size, который клиент пришлёт в /confirm).
export async function headObject(
  key: string
): Promise<{ size: number; contentType: string } | null> {
  try {
    const res = await s3.send(
      new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key })
    );
    return {
      size: Number(res.ContentLength ?? 0),
      contentType: res.ContentType ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
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
