import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import {
  makeLoginKey,
  getLockRemainingSec,
  registerFailure,
  registerSuccess,
  LOCKOUT_ERROR_PREFIX,
} from "./rate-limit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // IP клиента (за прокси — первый адрес из x-forwarded-for).
        const fwd = (req?.headers?.["x-forwarded-for"] as string | undefined) ?? "";
        const ip =
          fwd.split(",")[0]?.trim() ||
          (req?.headers?.["x-real-ip"] as string | undefined) ||
          "unknown";
        const key = makeLoginKey(credentials.email, ip);

        // Блокировка после серии неудачных попыток.
        const lockSec = getLockRemainingSec(key);
        if (lockSec > 0) {
          throw new Error(`${LOCKOUT_ERROR_PREFIX}:${lockSec}`);
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || user.isBlocked) {
          registerFailure(key);
          return null;
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          registerFailure(key);
          return null;
        }

        registerSuccess(key);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          companyId: user.companyId ?? null,
          position: user.position ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatarUrl = user.avatarUrl ?? null;
        token.companyId = user.companyId ?? null;
        token.position = user.position ?? null;
      }
      if (trigger === "update" && session?.avatarUrl !== undefined) {
        token.avatarUrl = session.avatarUrl;
      }
      if (trigger === "update" && session?.position !== undefined) {
        token.position = session.position;
      }
      // Бэкфил для старых токенов, выпущенных до того, как мы стали класть position
      // в JWT. Без этого пользователю пришлось бы перелогиниться, чтобы увидеть
      // свою должность в шапке. Запрос идёт ровно один раз — после первого вызова
      // token.position становится определённым (null или строкой) и условие больше
      // не срабатывает.
      if (token.position === undefined && token.id) {
        const u = await prisma.user.findUnique({
          where: { id: token.id },
          select: { position: true },
        });
        token.position = u?.position ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.avatarUrl = token.avatarUrl ?? null;
        session.user.companyId = token.companyId ?? null;
        session.user.position = token.position ?? null;
      }
      return session;
    },
  },
};
