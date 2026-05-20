"use client";
import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export function AvatarDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: session, update } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const userId = (session?.user as any)?.id as string | undefined;
  const name = session?.user?.name;
  const avatarUrl = (session?.user as any)?.avatarUrl as string | null | undefined;

  const upload = async (file: File) => {
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/users/${userId}/avatar`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "Не удалось загрузить фото");
        return;
      }
      const updated = await res.json();
      await update({ avatarUrl: updated.avatarUrl });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!userId || !avatarUrl) return;
    setBusy(true);
    setError(null);
    try {
      await fetch(`/api/users/${userId}/avatar`, { method: "DELETE" });
      await update({ avatarUrl: null });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Фото профиля</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <Avatar name={name} src={avatarUrl} size={96} />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <div className="flex w-full flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
            <Button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {avatarUrl ? "Заменить фото" : "Загрузить фото"}
            </Button>
            {avatarUrl && (
              <Button type="button" variant="outline" onClick={remove} disabled={busy} className="text-red-500 hover:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Удалить фото
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-400 text-center">PNG, JPG, WebP. Макс. 5 МБ</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
