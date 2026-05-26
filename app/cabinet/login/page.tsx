"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { oauthUrl } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  // Если уже авторизован — редиректим в кабинет
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/cabinet");
    }
  }, [isLoading, isAuthenticated, router]);

  const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Введите email";
    else if (!EMAIL_RE.test(email.trim()))
      e.email = "Некорректный email — проверьте формат";
    if (!password) e.password = "Введите пароль";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      router.replace("/cabinet");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 401
            ? "Неверный email или пароль"
            : err.message
          : "Ошибка соединения с сервером";
      setErrors({ form: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || isAuthenticated) return null;

  return (
    <main className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4 py-12 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {/* Title */}
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="inline-block mb-4 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              ЦФА.Навигатор
            </Link>
            <h1 className="text-2xl font-bold text-foreground">
              Войти в кабинет
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Нет аккаунта?{" "}
              <Link
                href="/cabinet/register"
                className="text-primary hover:underline font-medium"
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
              required
            />
            <Input
              type="password"
              label="Пароль"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
              required
            />

            {errors.form && (
              <p className="rounded-lg bg-danger/5 border border-danger/20 px-4 py-3 text-sm text-danger">
                {errors.form}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="md"
              isLoading={submitting}
            >
              Войти
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Входя в систему, вы принимаете{" "}
          <Link href="/" className="hover:underline">
            условия использования
          </Link>
        </p>
      </div>
    </main>
  );
}
