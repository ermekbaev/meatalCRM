// Клиентский helper для загрузки файлов через presigned PUT.
// Шаги: 1) /presign → URL и ключ; 2) PUT в S3 напрямую; 3) /confirm → запись в БД.

export async function uploadViaPresign<T = unknown>(
  baseEndpoint: string,
  file: File,
  extra?: Record<string, unknown>
): Promise<T> {
  const presignRes = await fetch(`${baseEndpoint}/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      ...extra,
    }),
  });
  if (!presignRes.ok) {
    const data = await presignRes.json().catch(() => ({}));
    throw new Error(data?.error ?? `Presign failed (HTTP ${presignRes.status})`);
  }
  const { uploadUrl, key } = (await presignRes.json()) as {
    uploadUrl: string;
    key: string;
  };

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Загрузка в S3 не удалась (HTTP ${putRes.status})`);
  }

  const confirmRes = await fetch(`${baseEndpoint}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key,
      name: file.name,
      type: file.type || "application/octet-stream",
      ...extra,
    }),
  });
  if (!confirmRes.ok) {
    const data = await confirmRes.json().catch(() => ({}));
    throw new Error(data?.error ?? `Confirm failed (HTTP ${confirmRes.status})`);
  }
  return (await confirmRes.json()) as T;
}
