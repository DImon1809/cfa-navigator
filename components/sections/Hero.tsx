'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { scrollToElement } from '@/lib/utils';
import { Shield, Building2, Wallet } from 'lucide-react';

const H1_PREFIX = "Сравните ЦФА ";
const H1_ACCENT = "от Сбера, Т-Банка и Атомайза";
const H1_SUFFIX = " — и выберите лучший";
const H1_FULL   = H1_PREFIX + H1_ACCENT + H1_SUFFIX;

function TypewriterH1() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= H1_FULL.length) return;
    const delay = count === 0 ? 400 : 42;
    const t = setTimeout(() => setCount(c => c + 1), delay);
    return () => clearTimeout(t);
  }, [count]);

  const prefixVisible = H1_FULL.slice(0, Math.min(count, H1_PREFIX.length));
  const accentCount   = Math.max(0, Math.min(count - H1_PREFIX.length, H1_ACCENT.length));
  const accentVisible = H1_ACCENT.slice(0, accentCount);
  const suffixCount   = Math.max(0, count - H1_PREFIX.length - H1_ACCENT.length);
  const suffixVisible = H1_SUFFIX.slice(0, suffixCount);
  const done          = count >= H1_FULL.length;

  return (
    <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
      {prefixVisible}
      {accentCount > 0 && (
        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {accentVisible}
        </span>
      )}
      {suffixVisible}
      {!done && (
        <span className="inline-block w-[3px] h-[0.8em] bg-foreground/70 rounded-sm align-middle ml-1 animate-pulse" />
      )}
    </h1>
  );
}

const TRUST_ITEMS = [
  { Icon: Shield,    text: 'Операторы с лицензией ЦБ РФ', delay: '1050ms' },
  { Icon: Building2, text: 'Сбер, Т-Банк, Атомайз',       delay: '1200ms' },
  { Icon: Wallet,    text: 'Комиссия за подбор — 0 ₽',    delay: '1350ms' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20 md:py-32">

      {/* Floating blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-secondary/10 blur-3xl animate-float-alt" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">

          {/* Badge */}
          <div className="mb-8 flex justify-center animate-fade-in-down">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Все легальные платформы ЦФА — в одном месте
            </span>
          </div>

          {/* H1 typewriter */}
          <TypewriterH1 />

          {/* Subtitle */}
          <p
            className="mb-12 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
            style={{ animationDelay: '250ms' }}
          >
            Агрегатор цифровых финансовых активов: все легальные платформы, доходность и условия — в одном месте
          </p>

          {/* Comparison block — строки въезжают справа как "расчёт AI" */}
          <div className="mb-8 max-w-lg mx-auto space-y-3 text-sm">
            <div
              className="flex justify-between items-center bg-muted/50 rounded-xl px-5 py-4 animate-slide-in-right"
              style={{ animationDelay: '500ms' }}
            >
              <span className="text-muted-foreground">Депозит Сбера: 16%</span>
              <span className="text-foreground font-medium">+12 000 ₽</span>
            </div>
            <div
              className="flex justify-between items-center bg-success/10 border border-success/20 rounded-xl px-5 py-4 animate-slide-in-right"
              style={{ animationDelay: '720ms' }}
            >
              <span className="text-success font-semibold">ЦФА от Сбера: 22%</span>
              <span className="text-success font-bold">+16 500 ₽</span>
            </div>
            <p
              className="text-center text-xs text-muted-foreground pt-1 animate-fade-in-up"
              style={{ animationDelay: '940ms' }}
            >
              При 150 000 ₽ за 6 месяцев — разница <strong className="text-foreground">4 500 ₽</strong>. Тот же банк.
            </p>
          </div>

          {/* CTA */}
          <div
            className="flex flex-col sm:flex-row justify-center gap-3 mb-4 animate-fade-in-scale"
            style={{ animationDelay: '860ms' }}
          >
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
          <p
            className="text-xs text-muted-foreground mb-12 animate-fade-in-up"
            style={{ animationDelay: '960ms' }}
          >
            Не звоним. Не спамим. Ответим за 1 час.
          </p>

          {/* Trust badges — стаггер */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TRUST_ITEMS.map(({ Icon, text, delay }) => (
              <div
                key={text}
                className="flex items-center gap-3 rounded-xl bg-card px-5 py-4 shadow-sm border border-border/50 animate-fade-in-up hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
                style={{ animationDelay: delay }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground text-left">{text}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
