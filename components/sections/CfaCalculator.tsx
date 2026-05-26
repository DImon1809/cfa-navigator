'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { scrollToElement } from '@/lib/utils';
import type { CfaItem } from '@/lib/types';

interface CfaCalculatorProps {
  items: CfaItem[];
}

const DEPOSIT_RATE = 0.16;
const TAX_RATE = 0.13;

function formatRub(n: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₽';
}

function mapAmountToCategory(amount: number): string {
  if (amount < 50000) return 'до 50к';
  if (amount < 150000) return '50-150к';
  if (amount < 300000) return '150-300к';
  if (amount < 1000000) return '300к-1млн';
  return '>1млн';
}

export function CfaCalculator({ items }: CfaCalculatorProps) {
  const [selectedId, setSelectedId] = useState<string>('all');
  const [amount, setAmount] = useState<number>(150000);
  const [investorType, setInvestorType] = useState<'Неквал' | 'Квал'>('Неквал');

  const openItems = useMemo(() => {
    return items
      .filter((i) => i.status === 'open' && i.access.includes(investorType))
      .sort((a, b) => b.yieldNumeric - a.yieldNumeric);
  }, [items, investorType]);

  const selectedItem = useMemo(() => {
    if (selectedId === 'all') return null;
    return openItems.find((i) => i.id === selectedId) ?? null;
  }, [selectedId, openItems]);

  const calcResult = useMemo(() => {
    if (!amount || amount <= 0) return null;

    const depositGross = amount * DEPOSIT_RATE * 0.5; // 6 месяцев как пример
    const depositNet = depositGross * (1 - TAX_RATE);

    if (selectedItem) {
      const months = selectedItem.termMonths || 6;
      const gross = amount * (selectedItem.yieldNumeric / 100) * (months / 12);
      const net = gross * (1 - TAX_RATE);
      const depGross2 = amount * DEPOSIT_RATE * (months / 12);
      const depNet2 = depGross2 * (1 - TAX_RATE);
      return { type: 'single', item: selectedItem, gross, net, depositNet: depNet2, months, win: net - depNet2 };
    }

    // Топ-3
    const top3 = openItems.slice(0, 3).map((item) => {
      const months = item.termMonths || 6;
      const gross = amount * (item.yieldNumeric / 100) * (months / 12);
      const net = gross * (1 - TAX_RATE);
      return { item, net, months };
    });
    return { type: 'top3', top3, depositNet };
  }, [amount, selectedItem, openItems]);

  const handleCta = () => {
    localStorage.setItem('cfa_prefilled_amount', mapAmountToCategory(amount));
    scrollToElement('form');
  };

  return (
    <section id="calculator" className="bg-muted/30 py-14 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">
            Калькулятор доходности ЦФА
          </h2>
          <p className="mb-8 text-muted-foreground">
            Введите параметры — результат появится сразу
          </p>

          {/* Поля ввода */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {/* Выпуск ЦФА */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Выпуск ЦФА
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">Все выпуски (показать топ-3)</option>
                {openItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.shortName || item.name} — {item.yield}
                  </option>
                ))}
              </select>
            </div>

            {/* Сумма */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Сумма инвестиций
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="150000"
                  min={1000}
                  step={1000}
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₽
                </span>
              </div>
            </div>
          </div>

          {/* Тип инвестора */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-foreground">
              Тип инвестора
            </label>
            <div className="flex gap-4">
              {(['Неквал', 'Квал'] as const).map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="investorType"
                    value={type}
                    checked={investorType === type}
                    onChange={() => {
                      setInvestorType(type);
                      setSelectedId('all');
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm text-foreground">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Результаты */}
          {calcResult && amount > 0 && (
            <div className="mb-6 rounded-xl border border-border bg-card p-6">
              {calcResult.type === 'single' && calcResult.item && (
                <div className="space-y-3">
                  <div className="text-base font-semibold text-foreground">
                    {calcResult.item.shortName || calcResult.item.name}
                    {' '}· {calcResult.months} мес.
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Доход за срок:</span>
                      <span className="font-semibold text-foreground">
                        +{formatRub(calcResult.gross)} ({calcResult.item.yield})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">После налога 13%:</span>
                      <span className="font-bold text-success">+{formatRub(calcResult.net)} чистыми</span>
                    </div>
                    <div className="border-t border-border pt-2">
                      <div className="flex justify-between text-muted-foreground">
                        <span>На депозите Сбера (16%):</span>
                        <span>+{formatRub(calcResult.depositNet)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-foreground">Ваш выигрыш от ЦФА:</span>
                        <span className="text-primary">+{formatRub(calcResult.win)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {calcResult.type === 'top3' && calcResult.top3 && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-foreground mb-3">
                    Топ-3 выпуска для вас:
                  </div>
                  {calcResult.top3.map((row, i) => (
                    <div
                      key={row.item.id}
                      className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-muted-foreground w-4">{i + 1}.</span>
                      <span className="flex-1 text-sm text-foreground">
                        {row.item.shortName || row.item.name}
                      </span>
                      <span className="text-sm font-semibold text-primary whitespace-nowrap">
                        {row.item.yield}
                      </span>
                      <span className="text-sm font-bold text-success whitespace-nowrap">
                        +{formatRub(row.net)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 text-xs text-muted-foreground">
                    На депозите Сбера (16%): +{formatRub(calcResult.depositNet)} — за аналогичный срок
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Мост к форме */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <p className="mb-2 font-semibold text-foreground">
              Вы посмотрели агрегированные данные.
            </p>
            <p className="mb-4 text-sm font-medium text-muted-foreground">
              Аналитик видит больше:
            </p>
            <ul className="mb-5 space-y-1.5 text-sm text-muted-foreground">
              <li>— реальную доступность выпуска (некоторые закрываются за часы)</li>
              <li>— условия досрочного погашения под вашу сумму</li>
              <li>— налоговые нюансы под ваш профиль инвестора</li>
              <li>— альтернативные выпуски, которых нет в открытом доступе</li>
            </ul>
            <Button onClick={handleCta} className="w-full sm:w-auto">
              Получить разбор под мой профиль →
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            * Расчёт ориентировочный. Фактическая доходность зависит от условий конкретного выпуска.
          </p>
        </div>
      </div>
    </section>
  );
}
