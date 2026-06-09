'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  User, Mail, Phone, Shield, Calendar,
  TrendingUp, Building2, Banknote, Sparkles, ChevronRight, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError, type CfaItem } from '@/lib/api';
import { formatRubles } from '@/lib/utils';
import { Footer } from '@/components/sections/Footer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function termDays(issue: string, maturity: string) {
  return Math.round(
    (new Date(maturity).getTime() - new Date(issue).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function confidenceBadge(v: number) {
  if (v >= 0.9) return { label: 'Высокая', cls: 'bg-success/10 text-success' };
  if (v >= 0.7) return { label: 'Средняя', cls: 'bg-warning/10 text-warning' };
  return { label: 'Низкая', cls: 'bg-danger/10 text-danger' };
}

// ─── Profile row ──────────────────────────────────────────────────────────────

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="w-32 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

// ─── CFA Card ─────────────────────────────────────────────────────────────────

function CfaCard({ item }: { item: CfaItem }) {
  const conf = confidenceBadge(item.confidence);
  const days = termDays(item.issue_date, item.maturity_date);

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <p className="mb-0.5 truncate text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {item.platform}
          </p>
          <h3 className="text-base font-semibold text-foreground leading-snug">{item.issuer_name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">ИНН {item.inn}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${conf.cls}`}>
          {conf.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border mx-5 rounded-xl overflow-hidden">
        <div className="bg-card px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Тип купона</p>
          <p className="text-sm font-semibold text-foreground">
            {item.coupon_rate_type === 'fixed' ? 'Фиксированный' : 'Плавающий'}
          </p>
        </div>
        <div className="bg-card px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Ставка</p>
          <p className="text-sm font-semibold text-foreground flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-success" />
            {item.coupon_rate_fixed !== null
              ? `${item.coupon_rate_fixed}% год.`
              : item.coupon_benchmark ?? '—'}
          </p>
        </div>
        <div className="bg-card px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Мин. лот</p>
          <p className="text-sm font-semibold text-foreground flex items-center gap-1">
            <Banknote className="h-3.5 w-3.5 text-primary" />
            {formatRubles(item.min_lot_rub)}
          </p>
        </div>
        <div className="bg-card px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Срок</p>
          <p className="text-sm font-semibold text-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-secondary" />
            {days} дн.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-3 text-xs text-muted-foreground">
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span>{formatShortDate(item.issue_date)}</span>
        <ChevronRight className="h-3 w-3" />
        <span>{formatShortDate(item.maturity_date)}</span>
      </div>

      {item.ai_summary && (
        <div className="mx-5 mb-3 rounded-xl bg-primary/5 px-4 py-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI-анализ
          </p>
          <p className="text-sm text-foreground leading-relaxed">{item.ai_summary}</p>
          {item.ai_facts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.ai_facts.map((f) => (
                <span
                  key={f.label}
                  className="rounded-full bg-background border border-border px-2.5 py-0.5 text-xs text-foreground"
                >
                  {f.label}: <span className="font-semibold">{f.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-5 pb-5 mt-auto">
        <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          {item.dfa_type}
        </span>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CabinetPage() {
  const { user } = useAuth();

  const [items, setItems] = useState<CfaItem[]>([]);
  const [cfaLoading, setCfaLoading] = useState(true);
  const [cfaError, setCfaError] = useState<string | null>(null);

  // Loads independently — user profile display does not depend on this
  useEffect(() => {
    api.cfa.active()
      .then(setItems)
      .catch((e) => setCfaError(e instanceof ApiError ? e.message : 'Не удалось загрузить выпуски'))
      .finally(() => setCfaLoading(false));
  }, []);

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.email ?? '';

  return (
    <>
      <main className="min-h-screen">
        {/* Hero */}
        <section className="border-b border-border bg-linear-to-br from-primary/5 via-background to-secondary/5 py-8 md:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <p className="mb-1 text-sm text-muted-foreground">Личный кабинет</p>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                {displayName ? `Добро пожаловать, ${displayName}` : 'Добро пожаловать'}
              </h1>
              {user?.email && (
                <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
              )}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="mx-auto max-w-4xl space-y-10">

            {/* Profile — always shows if user is loaded */}
            {user && (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-foreground">Профиль</h2>
                <div className="rounded-2xl border border-border bg-card divide-y divide-border">
                  <Row icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
                  {(user.firstName || user.lastName) && (
                    <Row
                      icon={<User className="h-4 w-4" />}
                      label="Имя"
                      value={[user.firstName, user.lastName].filter(Boolean).join(' ')}
                    />
                  )}
                  {user.phoneNumber && (
                    <Row icon={<Phone className="h-4 w-4" />} label="Телефон" value={user.phoneNumber} />
                  )}
                  <Row
                    icon={<Shield className="h-4 w-4" />}
                    label="Роль"
                    value={user.roles.includes('ROLE_ADMIN') ? 'Администратор' : 'Пользователь'}
                  />
                  {user.createdAt && (
                    <Row
                      icon={<Calendar className="h-4 w-4" />}
                      label="Зарегистрирован"
                      value={formatDate(user.createdAt)}
                    />
                  )}
                </div>
              </section>
            )}

            {/* CFA — independent, loads in parallel */}
            <section>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Активные выпуски ЦФА</h2>
                {!cfaLoading && !cfaError && items.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {items.length}
                  </span>
                )}
              </div>

              {cfaLoading && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-64 rounded-2xl border border-border bg-muted/30 animate-pulse" />
                  ))}
                </div>
              )}

              {!cfaLoading && cfaError && (
                <div className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-5">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                  <div>
                    <p className="font-semibold text-foreground">Ошибка загрузки выпусков</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{cfaError}</p>
                  </div>
                </div>
              )}

              {!cfaLoading && !cfaError && items.length === 0 && (
                <div className="rounded-2xl border border-border bg-muted/30 p-10 text-center">
                  <p className="text-muted-foreground">Активных выпусков пока нет</p>
                </div>
              )}

              {!cfaLoading && !cfaError && items.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {items.map((item) => <CfaCard key={item.id} item={item} />)}
                </div>
              )}
            </section>

            {/* Disclaimer */}
            <div className="rounded-2xl border border-border bg-muted/40 p-5">
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>ЦФА — не банковский вклад, не застрахованы АСВ</li>
                <li>
                  Для неквалов лимит{' '}
                  <span className="font-medium text-foreground">600 000 ₽/год</span>{' '}
                  суммарно на все платформы
                </li>
                <li>Перед покупкой читайте условия конкретного выпуска</li>
              </ul>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
