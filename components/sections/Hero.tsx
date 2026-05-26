'use client';

import { Button } from '@/components/ui/Button';
import { scrollToElement } from '@/lib/utils';
import { Shield, Building2, Wallet } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20 md:py-32">
      {/* Декоративные элементы */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">

          {/* Pill-badge */}
          <div className="mb-8 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Все легальные платформы ЦФА — в одном месте
            </span>
          </div>

          {/* H1 */}
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Сравните ЦФА{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              от Сбера, Т-Банка и Атомайза
            </span>
            {' '}— и выберите лучший
          </h1>

          {/* Подзаголовок */}
          <p className="mb-12 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto leading-relaxed">
            Агрегатор цифровых финансовых активов: все легальные платформы, доходность и условия — в одном месте
          </p>

          {/* Comparison-блок */}
          <div className="mb-8 max-w-lg mx-auto space-y-3 text-sm">
            <div className="flex justify-between items-center bg-muted/50 rounded-xl px-5 py-4">
              <span className="text-muted-foreground">Депозит Сбера: 16%</span>
              <span className="text-foreground font-medium">+12 000 ₽</span>
            </div>
            <div className="flex justify-between items-center bg-success/10 border border-success/20 rounded-xl px-5 py-4">
              <span className="text-success font-semibold">ЦФА от Сбера: 22%</span>
              <span className="text-success font-bold">+16 500 ₽</span>
            </div>
            <p className="text-center text-xs text-muted-foreground pt-1">
              При 150 000 ₽ за 6 месяцев — разница <strong className="text-foreground">4 500 ₽</strong>. Тот же банк.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 mb-4">
            <Button
              variant="warning"
              size="lg"
              onClick={() => scrollToElement('form')}
              className="text-lg font-semibold px-10 py-4 h-auto shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-150"
            >
              Получить мой расчёт за 1 час
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => scrollToElement('cfa-cards')}
              className="text-lg font-semibold px-10 py-4 h-auto hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
            >
              Сравнить ЦФА →
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-12">
            Не звоним. Не спамим. Ответим за 1 час.
          </p>

          {/* Trust indicators — полная ширина */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-card px-5 py-4 shadow-sm border border-border/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground text-left">Операторы с лицензией ЦБ РФ</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-card px-5 py-4 shadow-sm border border-border/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground text-left">Сбер, Т-Банк, Атомайз</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-card px-5 py-4 shadow-sm border border-border/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground text-left">Комиссия за подбор — 0 ₽</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
