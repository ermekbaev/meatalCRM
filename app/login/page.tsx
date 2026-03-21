"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Factory, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      setError("Неверный email или пароль");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f1f3f5]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-800 p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-600 shadow-lg shadow-slate-900/30">
            <Factory className="h-5 w-5 text-white" />
          </div>
          <span className="text-[15px] font-semibold text-white">МеталлCRM</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-white leading-snug">
            Управляйте заявками<br />
            <span className="text-slate-300">эффективно</span>
          </h2>
          <p className="mt-4 text-[14px] text-white/40 leading-relaxed max-w-sm">
            CRM-система для металлообрабатывающего производства. Заявки, контрагенты, коммерческие предложения — всё в одном месте.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: "Заявки", desc: "Полный контроль" },
              { label: "КП", desc: "PDF за секунды" },
              { label: "Аналитика", desc: "Всегда в курсе" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-white/8 bg-white/4 p-4">
                <p className="text-[13px] font-semibold text-white">{f.label}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-white/20">© 2025 МеталлCRM</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700 shadow-sm lg:hidden">
              <Factory className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Вход в систему</h1>
            <p className="mt-1 text-[13px] text-gray-400">Введите ваши учётные данные</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@metalcrm.ru"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\s/g, "");
                    setPassword(pasted);
                  }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-10 text-[13px] bg-slate-700 hover:bg-slate-800" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Войти
            </Button>
          </form>

          <p className="mt-6 rounded-lg bg-gray-100 px-4 py-2.5 text-center text-[11px] text-gray-400">
            admin@metalcrm.ru · admin123
          </p>
        </div>
      </div>
    </div>
  );
}
