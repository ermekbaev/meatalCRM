"use client";
import { useEffect, useRef } from "react";

// Дёргает server action ровно один раз после монтирования, чтобы пометить
// портальную заявку прочитанной и инвалидировать кэш списка компаний.
// Вынесено из рендера серверного компонента: в Next 16 revalidatePath во время
// рендера запрещён (digest-краш на /companies/[id]/requests/[reqId]).
export function MarkViewed({ action }: { action: () => Promise<void> }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void action();
  }, [action]);
  return null;
}
