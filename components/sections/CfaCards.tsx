'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { CfaItem, CfaFilters } from '@/lib/types';

interface CfaCardsProps {
  items: CfaItem[];
}

// Map numeric amount to form bucket value
function amountToBucket(amount: number): string {
  if (amount < 50000) return 'до 50к';
  if (amount < 150000) return '50-150к';
  if (amount < 300000) return '150-300к';
  if (amount < 1000000) return '300к-1млн';
  return '>1млн';
}

// Check if CFA is linked to an asset price (BTC, gold, etc.)
function isAssetLinked(item: CfaItem): boolean {
  const t = item.type.toLowerCase();
  return t.includes('курс') || t.includes('btc') || t.includes('биткоин') || t.includes('золот') || t.includes('gold');
}

export function CfaCards({ items }: CfaCardsProps) {
  const [filters, setFilters] = useState<CfaFilters>({
    minYield: 0,
    maxInvestment: null,
    operator: null,
    status: 'all',
    searchQuery: '',
  });

  const [carouselIndex, setCarouselIndex] = useState(0);
  const CARDS_PER_PAGE = 6;

  // Calculator modal state
  const [calcItem, setCalcItem] = useState<CfaItem | null>(null);
  const [calcAmount, setCalcAmount] = useState(150000);
  const [calcMonths, setCalcMonths] = useState(6);

  const handleOpenCalc = (item: CfaItem) => {
    setCalcItem(item);
    setCalcMonths(item.termMonths);
    setCalcAmount(Math.max(item.minAmountNumeric, 150000));
  };

  const handleCloseCalc = () => setCalcItem(null);

  // Получить уникальные операторы
  const operators = useMemo(() => {
    const uniqueOperators = Array.from(new Set(items.map((item) => item.operator)));
    return uniqueOperators.sort();
  }, [items]);

  // Фильтрация
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (item.yieldNumeric < filters.minYield) return false;
      if (filters.maxInvestment && item.minAmountNumeric > filters.maxInvestment) return false;
      if (filters.operator && item.operator !== filters.operator) return false;
      if (filters.status !== 'all' && item.status !== filters.status) return false;
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const searchableText = [item.name, item.operator, item.platform, item.type].join(' ').toLowerCase();
        if (!searchableText.includes(query)) return false;
      }
      return true;
    });
  }, [items, filters]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.minYield > 0 ||
      filters.maxInvestment !== null ||
      filters.operator !== null ||
      filters.status !== 'all' ||
      filters.searchQuery !== ''
    );
  }, [filters]);

  const displayedItems = useMemo(() => {
    if (hasActiveFilters) {
      return filteredItems;
    } else {
      const start = carouselIndex * CARDS_PER_PAGE;
      return filteredItems.slice(start, start + CARDS_PER_PAGE);
    }
  }, [filteredItems, hasActiveFilters, carouselIndex]);

  const totalPages = Math.ceil(filteredItems.length / CARDS_PER_PAGE);

  const resetFilters = () => {
    setFilters({ minYield: 0, maxInvestment: null, operator: null, status: 'all', searchQuery: '' });
    setCarouselIndex(0);
  };

  const nextPage = () => {
    if (carouselIndex < totalPages - 1) setCarouselIndex(carouselIndex + 1);
  };

  const prevPage = () => {
    if (carouselIndex > 0) setCarouselIndex(carouselIndex - 1);
  };

  // Calculator results
  const calcResults = useMemo(() => {
    if (!calcItem) return null;
    const gross = calcAmount * (calcItem.yieldNumeric / 100) * (calcMonths / 12);
    const net = gross * 0.87;
    const deposit = calcAmount * 0.16 * (calcMonths / 12) * 0.87;
    const win = net - deposit;
    return { gross, net, deposit, win };
  }, [calcItem, calcAmount, calcMonths]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);

  const handleCalcCta = () => {
    if (!calcItem) return;
    localStorage.setItem('cfa_prefilled_amount', amountToBucket(calcAmount));
    handleCloseCalc();
    const el = document.getElementById('form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="cfa-cards" className="bg-muted/30 py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-8 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Все предложения ЦФА
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Сравните условия и выберите лучший вариант для ваших инвестиций
          </p>
        </div>

        {/* Фильтры */}
        <div className="mb-8 rounded-xl bg-card p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Минимальная доходность"
              value={filters.minYield.toString()}
              onChange={(e) => setFilters({ ...filters, minYield: parseFloat(e.target.value) })}
              options={[
                { value: '0', label: 'Любая' },
                { value: '5', label: 'От 5%' },
                { value: '10', label: 'От 10%' },
                { value: '15', label: 'От 15%' },
                { value: '20', label: 'От 20%' },
              ]}
            />
            <Select
              label="Максимальная сумма входа"
              value={filters.maxInvestment?.toString() || ''}
              onChange={(e) =>
                setFilters({ ...filters, maxInvestment: e.target.value ? parseInt(e.target.value) : null })
              }
              options={[
                { value: '', label: 'Любая' },
                { value: '10000', label: 'До 10 000 ₽' },
                { value: '50000', label: 'До 50 000 ₽' },
                { value: '100000', label: 'До 100 000 ₽' },
                { value: '300000', label: 'До 300 000 ₽' },
              ]}
            />
            <Select
              label="Оператор/Платформа"
              value={filters.operator || ''}
              onChange={(e) => setFilters({ ...filters, operator: e.target.value || null })}
              options={[
                { value: '', label: 'Все операторы' },
                ...operators.map((op) => ({ value: op, label: op })),
              ]}
            />
            <Select
              label="Статус"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as CfaFilters['status'] })}
              options={[
                { value: 'all', label: 'Все' },
                { value: 'open', label: 'Открытые' },
                { value: 'closed', label: 'Закрытые' },
                { value: 'soon', label: 'Скоро' },
              ]}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          </div>
        </div>

        {/* Результаты */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {hasActiveFilters ? (
              <>Найдено предложений: {filteredItems.length}</>
            ) : (
              <>
                Показаны {carouselIndex * CARDS_PER_PAGE + 1}-
                {Math.min((carouselIndex + 1) * CARDS_PER_PAGE, filteredItems.length)} из{' '}
                {filteredItems.length}
              </>
            )}
          </div>
          {!hasActiveFilters && totalPages > 1 && (
            <div className="flex items-center gap-4">
              <button
                onClick={prevPage}
                disabled={carouselIndex === 0}
                className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-primary bg-white text-primary shadow-lg transition-all hover:bg-primary hover:text-white disabled:border-gray-300 disabled:text-gray-300 disabled:hover:bg-white disabled:cursor-not-allowed"
                aria-label="Предыдущая страница"
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-lg font-semibold text-foreground min-w-[70px] text-center">
                {carouselIndex + 1} / {totalPages}
              </span>
              <button
                onClick={nextPage}
                disabled={carouselIndex === totalPages - 1}
                className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-primary bg-white text-primary shadow-lg transition-all hover:bg-primary hover:text-white disabled:border-gray-300 disabled:text-gray-300 disabled:hover:bg-white disabled:cursor-not-allowed"
                aria-label="Следующая страница"
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Карточки */}
        {displayedItems.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayedItems.map((item) => (
              <CfaCard key={item.id} item={item} onCalculate={handleOpenCalc} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-card p-12 text-center">
            <div className="mb-4 text-6xl">🔍</div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">Ничего не найдено</h3>
            <p className="mb-6 text-muted-foreground">Попробуйте изменить параметры фильтров</p>
            <Button onClick={resetFilters}>Сбросить фильтры</Button>
          </div>
        )}
      </div>

      {/* Модальное окно калькулятора */}
      <Modal isOpen={calcItem !== null} onClose={handleCloseCalc}>
        {calcItem && calcResults && (
          <div>
            {/* Бейдж + название */}
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 flex-wrap">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    calcItem.status === 'open'
                      ? 'bg-success text-success-foreground'
                      : calcItem.status === 'soon'
                      ? 'bg-warning text-warning-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {calcItem.status === 'open' ? 'Открыто' : calcItem.status === 'soon' ? 'Скоро' : 'Закрыто'}
                </span>
                {calcItem.badge && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                    {calcItem.badge}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-foreground">{calcItem.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {calcItem.operator} • {calcItem.platform}
              </p>
            </div>

            {/* Ключевые параметры */}
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Доходность</div>
                <div className="font-semibold text-success">{calcItem.yield}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Тип</div>
                <div className="font-medium text-foreground">{calcItem.type}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Срок</div>
                <div className="font-medium text-foreground">{calcItem.term}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Минимум</div>
                <div className="font-medium text-foreground">{calcItem.minAmount}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">Доступность</div>
                <div className="font-medium text-foreground">{calcItem.access.join(', ')}</div>
              </div>
            </div>

            <hr className="mb-5 border-border" />

            {/* Калькулятор */}
            <div className="mb-4">
              <h4 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
                Калькулятор доходности
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Сумма инвестиций, ₽</label>
                  <input
                    type="number"
                    min={calcItem.minAmountNumeric}
                    step={1000}
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Math.max(calcItem.minAmountNumeric, Number(e.target.value) || 0))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {calcAmount < calcItem.minAmountNumeric && (
                    <p className="mt-1 text-xs text-destructive">Минимальная сумма: {calcItem.minAmount}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Срок, месяцев</label>
                  <select
                    value={calcMonths}
                    onChange={(e) => setCalcMonths(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {[1, 2, 3, 6, 9, 12, 18, 24].map((m) => (
                      <option key={m} value={m}>
                        {m} мес.
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Результат */}
            <div className="mb-5 rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Доход за срок</span>
                <span className="font-semibold text-success">
                  +{fmt(calcResults.gross)} ₽
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({calcItem.yieldNumeric}% годовых)
                  </span>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">После налога 13%</span>
                <span className="font-semibold text-foreground">+{fmt(calcResults.net)} ₽ чистыми</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">На депозите (16%)</span>
                <span className="text-foreground">+{fmt(calcResults.deposit)} ₽</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-foreground">Ваш выигрыш vs депозит</span>
                <span className={calcResults.win >= 0 ? 'text-success' : 'text-destructive'}>
                  {calcResults.win >= 0 ? '+' : ''}{fmt(calcResults.win)} ₽
                </span>
              </div>
              {isAssetLinked(calcItem) && (
                <p className="text-xs text-muted-foreground">
                  * Для привязанных к курсу активов — ориентировочный расчёт на основе максимальной доходности.
                </p>
              )}
            </div>

            {/* CTA */}
            <Button className="w-full" onClick={handleCalcCta}>
              Получить персональную подборку ЦФА →
            </Button>
          </div>
        )}
      </Modal>
    </section>
  );
}

// Компонент отдельной карточки ЦФА
function CfaCard({ item, onCalculate }: { item: CfaItem; onCalculate: (item: CfaItem) => void }) {
  const statusColors = {
    open: 'bg-success text-success-foreground',
    closed: 'bg-muted text-muted-foreground',
    soon: 'bg-warning text-warning-foreground',
  };

  const statusLabels = {
    open: 'Открыто',
    closed: 'Закрыто',
    soon: 'Скоро',
  };

  return (
    <Card variant="bordered" className="group transition-all hover:shadow-lg">
      <div className="flex h-full flex-col p-4">
        {/* Заголовок и бейдж */}
        <div className="mb-2">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <h3 className="flex-1 text-base font-semibold text-foreground group-hover:text-primary line-clamp-2">
              {item.name}
            </h3>
            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status]}`}
            >
              {statusLabels[item.status]}
            </span>
          </div>
          {item.badge && (
            <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              {item.badge}
            </span>
          )}
        </div>

        {/* Оператор */}
        <div className="mb-2 text-xs text-muted-foreground">
          {item.operator} • {item.platform}
        </div>

        {/* Доходность (крупно) */}
        <div className="mb-3">
          <div className="text-2xl font-bold text-success">{item.yield}</div>
          <div className="text-xs text-muted-foreground">{item.type}</div>
        </div>

        {/* Параметры */}
        <div className="mb-3 space-y-1 border-t border-border pt-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Срок:</span>
            <span className="font-medium">{item.term}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Минимум:</span>
            <span className="font-medium">{item.minAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Доступ:</span>
            <span className="font-medium">{item.access.join(', ')}</span>
          </div>
        </div>

        {/* Рейтинг */}
        {item.rating && item.reviewCount ? (
          <div className="mb-2 flex items-center text-xs">
            <span className="mr-1 text-warning">★</span>
            <span className="font-medium">{item.rating.toFixed(1)}</span>
            <span className="ml-1 text-muted-foreground">({item.reviewCount})</span>
          </div>
        ) : null}

        {/* Описание */}
        {item.description && (
          <p className="mb-2 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Особенности */}
        {item.features && item.features.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {item.features.slice(0, 2).map((feature, idx) => (
              <span key={idx} className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                {feature}
              </span>
            ))}
          </div>
        )}

        {/* Кнопки */}
        <div className="mt-auto space-y-2">
          {item.status === 'open' ? (
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={() => onCalculate(item)}
            >
              Рассчитать доходность
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full" disabled>
              {item.status === 'soon' ? 'Скоро открытие' : 'Недоступно'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
