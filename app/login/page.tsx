"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User, Lock, LogIn, Loader2 } from "lucide-react";
import { ParticlesBackground } from "@/components/ParticlesBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Неверный логин или пароль");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
      {/* Градиентный фон */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900" />

      {/* Частицы */}
      <ParticlesBackground />

      {/* Карточка */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Шапка */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-8 py-6 text-center">
            <h1 className="text-2xl font-bold text-white tracking-wide">МеталлCRM</h1>
            <p className="text-blue-100 text-sm mt-1">Металлообрабатывающая компания</p>
            <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
              <LogIn className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">Вход в систему</span>
            </div>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {/* Логин */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4 text-slate-600" />
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm outline-none"
                  placeholder="admin@metalcrm.ru"
                  autoComplete="email"
                  required
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Пароль */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Lock className="w-4 h-4 text-slate-600" />
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\s/g, "");
                    setPassword(pasted);
                  }}
                  disabled={loading}
                  className="w-full px-4 py-2.5 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm outline-none"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Ошибка */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Кнопка */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-900/30 hover:shadow-xl hover:shadow-slate-900/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Вход...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Войти</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-4">© 2025 МеталлCRM</p>
      </div>
    </div>
  );
}
