/**
 * Расширение типов NextAuth: `session.user` и `User`/`JWT` несут наши поля
 * (id, role, avatarUrl). Это убирает `session.user.X` по коду.
 *
 * Связано с `lib/auth.ts` (jwt/session callbacks кладут эти поля в токен/сессию).
 */
import type { UserRole } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      avatarUrl: string | null;
      companyId: string | null;
      position: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    avatarUrl: string | null;
    companyId: string | null;
    position: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    avatarUrl: string | null;
    companyId: string | null;
    position: string | null;
  }
}
