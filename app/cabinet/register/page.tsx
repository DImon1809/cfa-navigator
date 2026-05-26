"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<
    Partial<typeof form> & { form?: string; agreed?: string }
  >({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/cabinet");
    }
  }, [isLoading, isAuthenticated, router]);

  const set =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  const passwordRules = [
    { test: (p: string) => p.length >= 8,          label: 'Минимум 8 символов' },
    { test: (p: string) => /[A-ZА-ЯЁ]/.test(p),   label: 'Одна заглавная буква' },
    { test: (p: string) => /[0-9]/.test(p),        label: 'Одна цифра' },
    { test: (p: string) => /[!@#$%^&*\-_]/.test(p), label: 'Один спецсимвол (!@#$%^&*-_)' },
  ];

  const validate = () => {
    const e: typeof errors = {};
    if (!form.email.trim()) e.email = "Введите email";
    else if (!EMAIL_RE.test(form.email.trim())) e.email = "Некорректный email — проверьте формат";
    if (!form.password) {
      e.password = "Введите пароль";
    } else {
      const failed = passwordRules.find((r) => !r.test(form.password));
      if (failed) e.password = failed.label;
    }
    if (!form.passwordConfirm) e.passwordConfirm = "Повторите пароль";
    else if (form.password !== form.passwordConfirm) e.passwordConfirm = "Пароли не совпадают";
    if (!agreed) e.agreed = "Необходимо принять пользовательское соглашение";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
      });
      router.replace("/cabinet/login");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 409
            ? "Пользователь с таким email уже существует"
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
              Создать аккаунт
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Уже есть аккаунт?{" "}
              <Link
                href="/cabinet/login"
                className="text-primary hover:underline font-medium"
              >
                Войти
              </Link>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Имя"
                placeholder="Иван"
                value={form.firstName}
                onChange={set("firstName")}
                error={errors.firstName}
                autoComplete="given-name"
              />
              <Input
                label="Фамилия"
                placeholder="Иванов"
                value={form.lastName}
                onChange={set("lastName")}
                error={errors.lastName}
                autoComplete="family-name"
              />
            </div>
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set("email")}
              error={errors.email}
              autoComplete="email"
              required
            />
            <div>
              <Input
                type="password"
                label="Пароль"
                placeholder="Минимум 8 символов"
                value={form.password}
                onChange={set("password")}
                error={errors.password}
                autoComplete="new-password"
                required
              />
              {form.password && (
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                  {passwordRules.map((r) => (
                    <li key={r.label} className={`flex items-center gap-1 text-xs ${r.test(form.password) ? 'text-success' : 'text-muted-foreground'}`}>
                      <span>{r.test(form.password) ? '✓' : '○'}</span>
                      {r.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Input
              type="password"
              label="Повторите пароль"
              placeholder="••••••••"
              value={form.passwordConfirm}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, passwordConfirm: val }));
                setErrors((prev) => ({
                  ...prev,
                  passwordConfirm:
                    val && val !== form.password ? "Пароли не совпадают" : undefined,
                }));
              }}
              error={errors.passwordConfirm}
              autoComplete="new-password"
              required
            />

            {/* Пользовательское соглашение */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary cursor-pointer"
                />
                <span className="text-sm text-muted-foreground leading-snug">
                  Я принимаю условия{" "}
                  <Link
                    href="/user-agreement"
                    target="_blank"
                    className="text-primary hover:underline font-medium"
                  >
                    Пользовательского соглашения
                  </Link>{" "}
                  и даю согласие на обработку персональных данных
                </span>
              </label>
              {errors.agreed && (
                <p className="mt-1.5 text-sm text-danger">{errors.agreed}</p>
              )}
            </div>

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
              disabled={!agreed}
            >
              Создать аккаунт
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Регистрируясь, вы принимаете{" "}
          <Link href="/" className="hover:underline">
            условия использования
          </Link>
        </p>
      </div>
    </main>
  );
}
