import { cn } from "@/lib/utils";

interface AvatarProps {
  name?: string | null;
  src?: string | null; // S3 key, отдаётся через /api/files
  size?: number; // px
  className?: string;
}

export function Avatar({ name, src, size = 32, className }: AvatarProps) {
  const initial = (name?.trim().charAt(0) || "?").toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.42)) };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-medium text-blue-700",
        className
      )}
      style={style}
      title={name ?? undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/files?key=${encodeURIComponent(src)}&view=1`}
          alt={name ?? ""}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </div>
  );
}
