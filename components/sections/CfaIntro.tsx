'use client';

import { useEffect, useState } from 'react';
import { useInView } from '@/lib/use-in-view';

const platforms = ['Сбер', 'Т-Банк', 'Атомайз', 'Токеон', 'Альфа', 'ВТБ'];

function useCountUp(target: number, duration: number, active: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return val;
}

export function CfaIntro() {
  const { ref, inView } = useInView(0.3);
  const yieldVal = useCountUp(34, 900, inView);

  return (
    <section ref={ref} className="bg-muted/50 border-y border-border overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mx-auto max-w-5xl">
          <div className={`flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            {/* Объяснение + платформы */}
            <div className="max-w-xl">
              <p className="text-sm leading-relaxed text-muted-foreground">
                <strong className="text-foreground">ЦФА</strong> — цифровые финансовые активы,
                выпускаемые российскими банками и платформами под надзором ЦБ РФ (259-ФЗ).
                Доходнее депозита, налоги платит оператор, блокировки счёта нет.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {platforms.map((p, i) => (
                  <span
                    key={p}
                    className="rounded-full bg-card border border-border px-3 py-0.5 text-xs text-muted-foreground transition-all duration-500"
                    style={{
                      transitionDelay: inView ? `${i * 60}ms` : '0ms',
                      opacity:    inView ? 1 : 0,
                      transform:  inView ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(6px)',
                    }}
                  >
                    {p}
                  </span>
                ))}
                <span
                  className="rounded-full bg-card border border-border px-3 py-0.5 text-xs text-muted-foreground transition-all duration-500"
                  style={{
                    transitionDelay: inView ? `${platforms.length * 60}ms` : '0ms',
                    opacity:   inView ? 1 : 0,
                    transform: inView ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(6px)',
                  }}
                >
                  и другие
                </span>
              </div>
            </div>

            {/* Статистика */}
            <div className="flex items-center gap-6 shrink-0">
              <div
                className="text-center transition-all duration-600"
                style={{
                  transitionDelay: inView ? '200ms' : '0ms',
                  opacity:   inView ? 1 : 0,
                  transform: inView ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(8px)',
                }}
              >
                <div className="text-lg font-bold text-foreground">от 1 000 ₽</div>
                <div className="text-xs text-muted-foreground">порог входа</div>
              </div>

              <div className="h-10 w-px bg-border" />

              <div
                className="text-center transition-all duration-600"
                style={{
                  transitionDelay: inView ? '350ms' : '0ms',
                  opacity:   inView ? 1 : 0,
                  transform: inView ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(8px)',
                }}
              >
                <div className="text-lg font-bold text-success tabular-nums">
                  до {inView ? yieldVal : 0}%
                </div>
                <div className="text-xs text-muted-foreground">доходность / год</div>
              </div>

              <div className="h-10 w-px bg-border" />

              <div
                className="text-center transition-all duration-600"
                style={{
                  transitionDelay: inView ? '500ms' : '0ms',
                  opacity:   inView ? 1 : 0,
                  transform: inView ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(8px)',
                }}
              >
                <div className="text-lg font-bold text-foreground">0 ₽</div>
                <div className="text-xs text-muted-foreground">комиссия за подбор</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
