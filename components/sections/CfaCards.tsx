'use client';

import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { CfaItem, CfaStatus } from '@/lib/types';
import type { AggregatedResult } from '@/lib/parsers/types';

// ─── Типы ────────────────────────────────────────────────────────────────────

type SortCol = 'date' | 'yield' | 'term' | 'amount' | 'name';
type SortDir = 'asc' | 'desc';

// ─── Вспомогательные ─────────────────────────────────────────────────────────

const STATUS_LABEL: Record<CfaStatus, string> = {
  open: 'Открыто',
  soon: 'Скоро',
  closed: 'Закрыто',
};

const STATUS_DOT: Record<CfaStatus, string> = {
  open: 'bg-green-500',
  soon: 'bg-yellow-400',
  closed: 'bg-red-500',
};

const STATUS_BADGE: Record<CfaStatus, string> = {
  open: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  soon: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  closed: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
};

const PER_PAGE = 25;

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

function isAssetLinked(item: CfaItem) {
  const t = item.type.toLowerCase();
  return t.includes('курс') || t.includes('btc') || t.includes('золот');
}

// ─── Скелетон ────────────────────────────────────────────────────────────────

const COLS = 9; // количество колонок компактной таблицы

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: COLS }).map((_, i) => (
        <td key={i} className="px-3 py-2.5">
          <div className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${35 + (i * 17) % 45}%` }} />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
      <div className="flex justify-between items-start gap-2">
        <div className="h-4 bg-muted rounded w-3/5" />
        <div className="h-5 bg-muted rounded-full w-16" />
      </div>
      <div className="h-3 bg-muted rounded w-2/5" />
      <div className="h-7 bg-muted rounded w-1/3" />
      <div className="space-y-2 border-t border-border pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 bg-muted rounded w-1/4" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Мобильная карточка ───────────────────────────────────────────────────────

function MobileCard({ item, onCalc }: { item: CfaItem; onCalc: (item: CfaItem) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
            {item.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            {item.operator}{item.releaseDate ? ` · ${item.releaseDate}` : ''}
          </p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status]}`}>
          {STATUS_LABEL[item.status]}
        </span>
      </div>

      <div className="mb-3">
        <span className="text-2xl font-bold text-green-600 dark:text-green-400">{item.yield}</span>
        <span className="ml-2 text-xs text-muted-foreground">{item.type}</span>
      </div>

      <div className="space-y-1.5 border-t border-border pt-2.5 text-xs">
        {item.placementStart && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Начало разм.</span>
            <span className="font-medium">{item.placementStart}</span>
          </div>
        )}
        {item.placementEnd && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Конец разм.</span>
            <span className="font-medium">{item.placementEnd}</span>
          </div>
        )}
        {item.maturityDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Погашение</span>
            <span className="font-medium">{item.maturityDate}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Срок</span>
          <span className="font-medium">{item.term}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Softcap</span>
          <span className="font-medium">{item.minAmount}</span>
        </div>
        {item.hardcap && item.hardcap !== '—' && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hardcap</span>
            <span className="font-medium">{item.hardcap}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Доступ</span>
          <span className="font-medium">{item.access.join(', ')}</span>
        </div>
        {item.description && (
          <div className="pt-1">
            <p className="text-muted-foreground line-clamp-3 leading-relaxed">{item.description}</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {item.status === 'open' && (
          <button
            onClick={() => onCalc(item)}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Рассчитать
          </button>
        )}
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          Документ →
        </a>
      </div>
    </div>
  );
}

// ─── Калькулятор ─────────────────────────────────────────────────────────────

function Calculator({ item, onClose }: { item: CfaItem; onClose: () => void }) {
  const [amount, setAmount] = useState(Math.max(item.minAmountNumeric || 1000, 150_000));
  const [months, setMonths] = useState(item.termMonths || 6);

  const result = useMemo(() => {
    const gross = amount * (item.yieldNumeric / 100) * (months / 12);
    const net = gross * 0.87;
    const deposit = amount * 0.16 * (months / 12) * 0.87;
    return { gross, net, deposit, win: net - deposit };
  }, [amount, months, item.yieldNumeric]);

  const handleCta = () => {
    if (typeof localStorage !== 'undefined') {
      const bucket =
        amount < 50_000 ? 'до 50к'
        : amount < 150_000 ? '50-150к'
        : amount < 300_000 ? '150-300к'
        : amount < 1_000_000 ? '300к-1млн'
        : '>1млн';
      localStorage.setItem('cfa_prefilled_amount', bucket);
    }
    onClose();
    document.getElementById('form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <div className="mb-4">
        <div className="mb-2 flex flex-wrap gap-2 items-center">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status]}`}>
            {STATUS_LABEL[item.status]}
          </span>
        </div>
        <h3 className="text-lg font-bold text-foreground">{item.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{item.operator}</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Доходность</div>
          <div className="font-semibold text-green-600 dark:text-green-400">{item.yield}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Тип</div>
          <div className="font-medium text-foreground">{item.type}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Срок</div>
          <div className="font-medium">{item.term}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Минимум</div>
          <div className="font-medium">{item.minAmount}</div>
        </div>
      </div>

      <hr className="mb-4 border-border" />

      <div className="mb-4 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Калькулятор доходности
        </h4>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Сумма, ₽</label>
          <input
            type="number"
            min={item.minAmountNumeric || 0}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(Math.max(item.minAmountNumeric || 0, Number(e.target.value) || 0))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Срок, месяцев</label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {[1, 2, 3, 6, 9, 12, 18, 24].map((m) => (
              <option key={m} value={m}>{m} мес.</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-border bg-muted/30 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Доход за срок</span>
          <span className="font-semibold text-green-600">+{fmt(result.gross)} ₽</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">После налога 13%</span>
          <span className="font-semibold">+{fmt(result.net)} ₽</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">На депозите (16%)</span>
          <span className="text-muted-foreground">+{fmt(result.deposit)} ₽</span>
        </div>
        <hr className="border-border" />
        <div className="flex justify-between text-sm font-bold">
          <span>Выигрыш vs депозит</span>
          <span className={result.win >= 0 ? 'text-green-600' : 'text-red-500'}>
            {result.win >= 0 ? '+' : ''}{fmt(result.win)} ₽
          </span>
        </div>
        {isAssetLinked(item) && (
          <p className="text-xs text-muted-foreground">
            * Расчёт ориентировочный — доходность зависит от курса актива.
          </p>
        )}
      </div>

      <button
        onClick={handleCta}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
      >
        Получить персональную подборку →
      </button>
    </div>
  );
}

// ─── Основной компонент ───────────────────────────────────────────────────────

export function CfaCards() {
  const [data, setData] = useState<AggregatedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [statusFilter, setStatusFilter] = useState<CfaStatus | 'all'>('open');
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [minYield, setMinYield] = useState(0);
  const [sortCol, setSortCol] = useState<SortCol>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [calcItem, setCalcItem] = useState<CfaItem | null>(null);

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/parse-cfa');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AggregatedResult = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const items = data?.allItems ?? [];

  // Счётчики по статусам
  const counts = useMemo(() => ({
    all: items.length,
    open: items.filter((i) => i.status === 'open').length,
    soon: items.filter((i) => i.status === 'soon').length,
    closed: items.filter((i) => i.status === 'closed').length,
  }), [items]);

  // Уникальные значения для дропдаунов (из всех данных, не из отфильтрованных)
  const years = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const y = i.releaseDate?.split('.')[2];
      if (y) set.add(y);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a)); // новые первые
  }, [items]);

  const platforms = useMemo(() => {
    const set = new Set(items.map((i) => i.operator));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [items]);

  const types = useMemo(() => {
    const set = new Set(items.map((i) => i.type).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [items]);

  const hasActiveFilters = yearFilter || platformFilter || typeFilter || minYield > 0 || search.trim();

  const resetFilters = () => {
    setSearch('');
    setYearFilter('');
    setPlatformFilter('');
    setTypeFilter('');
    setMinYield(0);
    setStatusFilter('open');
    setPage(0);
  };

  // Фильтрация
  const filtered = useMemo(() => {
    let list = statusFilter === 'all' ? items : items.filter((i) => i.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.operator.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q)
      );
    }
    if (yearFilter) {
      list = list.filter((i) => i.releaseDate?.split('.')[2] === yearFilter);
    }
    if (platformFilter) {
      list = list.filter((i) => i.operator === platformFilter);
    }
    if (typeFilter) {
      list = list.filter((i) => i.type === typeFilter);
    }
    if (minYield > 0) {
      list = list.filter((i) => i.yieldNumeric >= minYield);
    }
    return list;
  }, [items, statusFilter, search, yearFilter, platformFilter, typeFilter, minYield]);

  // Сортировка
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let diff = 0;
      if (sortCol === 'date') {
        const da = a.releaseDate ?? '';
        const db = b.releaseDate ?? '';
        // Формат DD.MM.YYYY — преобразуем в YYYY-MM-DD для корректного сравнения
        const toISO = (s: string) => s.split('.').reverse().join('-');
        diff = toISO(da).localeCompare(toISO(db));
      } else if (sortCol === 'yield') diff = a.yieldNumeric - b.yieldNumeric;
      else if (sortCol === 'term') diff = a.termMonths - b.termMonths;
      else if (sortCol === 'amount') diff = a.minAmountNumeric - b.minAmountNumeric;
      else diff = a.name.localeCompare(b.name, 'ru');
      return sortDir === 'asc' ? diff : -diff;
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  // Пагинация
  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const displayed = sorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); }
    setPage(0);
  };

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <span className="ml-1 text-muted-foreground/40">↕</span>;
    return <span className="ml-1 text-primary">{sortDir === 'desc' ? '↓' : '↑'}</span>;
  };

  const thBase = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none whitespace-nowrap';
  const thSort = `${thBase} cursor-pointer hover:text-foreground transition-colors`;

  // ─── Рендер ─────────────────────────────────────────────────────────────────

  return (
    <section id="cfa-cards" className="bg-muted/30 py-16 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Заголовок */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Все выпуски ЦФА
            </h2>
            {lastRefresh && (
              <p className="mt-1 text-xs text-muted-foreground">
                Обновлено: {lastRefresh.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Обновить
          </button>
        </div>

        {/* Ошибки источников (не критичные) */}
        {data?.errors && data.errors.length > 0 && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 px-4 py-2.5 text-xs text-yellow-700 dark:text-yellow-400">
            <span className="font-medium">Часть источников недоступна: </span>
            {data.errors.join(' • ')}
          </div>
        )}

        {/* Критическая ошибка */}
        {error && (
          <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-center">
            <p className="mb-3 text-sm text-destructive">Не удалось загрузить данные: {error}</p>
            <button
              onClick={fetchData}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90"
            >
              Повторить
            </button>
          </div>
        )}

        {/* Панель фильтров */}
        <div className="mb-5 space-y-3">

          {/* Строка 1: статус + поиск + счётчик */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex w-full sm:w-auto rounded-lg border border-border bg-card overflow-hidden text-sm">
              {(['all', 'open', 'soon', 'closed'] as const).map((s) => {
                const label = s === 'all' ? 'Все' : STATUS_LABEL[s];
                return (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setPage(0); }}
                    className={`px-3 py-1.5 transition-colors ${
                      statusFilter === s
                        ? 'bg-primary text-white font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {label}
                    {!loading && <span className="ml-1 text-xs opacity-70">({counts[s]})</span>}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Поиск по эмитенту, платформе, типу..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {!loading && (
              <span className="w-full sm:w-auto sm:ml-auto text-sm text-muted-foreground">
                {hasActiveFilters ? `Найдено: ${sorted.length}` : `Всего: ${items.length} выпусков`}
              </span>
            )}
          </div>

          {/* Строка 2: дропдауны */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            {/* Год */}
            <select
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value); setPage(0); }}
              className={`w-full sm:w-auto rounded-lg border px-3 py-2 sm:py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-colors ${yearFilter ? 'border-primary text-foreground' : 'border-border text-muted-foreground'}`}
            >
              <option value="">Все годы</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Платформа */}
            <select
              value={platformFilter}
              onChange={(e) => { setPlatformFilter(e.target.value); setPage(0); }}
              className={`w-full sm:w-auto rounded-lg border px-3 py-2 sm:py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-colors ${platformFilter ? 'border-primary text-foreground' : 'border-border text-muted-foreground'}`}
            >
              <option value="">Все платформы</option>
              {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Тип ЦФА */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
              className={`w-full sm:w-auto rounded-lg border px-3 py-2 sm:py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-colors ${typeFilter ? 'border-primary text-foreground' : 'border-border text-muted-foreground'}`}
            >
              <option value="">Все типы ЦФА</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* Мин. доходность */}
            <select
              value={minYield}
              onChange={(e) => { setMinYield(Number(e.target.value)); setPage(0); }}
              className={`w-full sm:w-auto rounded-lg border px-3 py-2 sm:py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-colors ${minYield > 0 ? 'border-primary text-foreground' : 'border-border text-muted-foreground'}`}
            >
              <option value={0}>Любая доходность</option>
              <option value={5}>От 5%</option>
              <option value={10}>От 10%</option>
              <option value={15}>От 15%</option>
              <option value={18}>От 18%</option>
              <option value={20}>От 20%</option>
              <option value={25}>От 25%</option>
              <option value={30}>От 30%</option>
            </select>

            {/* Сброс — на мобиле занимает обе колонки */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 sm:py-1.5 text-sm text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Сбросить фильтры
              </button>
            )}
          </div>
        </div>

        {/* ── DESKTOP: таблица ── */}
        <div className="hidden md:block">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    {/* chevron */}
                    <th className="w-8" />
                    <th className={thBase}>Статус</th>
                    <th className={thSort} onClick={() => toggleSort('date')}>
                      Дата <SortIcon col="date" />
                    </th>
                    <th className={thBase}>Платформа</th>
                    <th className={thSort} onClick={() => toggleSort('name')}>
                      Эмитент <SortIcon col="name" />
                    </th>
                    <th className={thSort} onClick={() => toggleSort('yield')}>
                      % <SortIcon col="yield" />
                    </th>
                    <th className={thBase}>Начало разм.</th>
                    <th className={thBase}>Конец разм.</th>
                    <th className={thBase}>Погашение</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                    : displayed.length === 0
                    ? (
                      <tr>
                        <td colSpan={COLS} className="py-16 text-center text-muted-foreground">
                          {hasActiveFilters
                            ? 'Ничего не найдено — попробуйте изменить фильтры'
                            : 'Данные загружаются...'}
                        </td>
                      </tr>
                    )
                    : displayed.map((item) => {
                      const isOpen = expandedId === item.id;
                      return (
                        <Fragment key={item.id}>
                          {/* ── Основная строка ── */}
                          <tr
                            onClick={() => toggleExpand(item.id)}
                            className={`group border-b border-border cursor-pointer transition-all duration-150 select-none ${
                              isOpen
                                ? 'bg-primary/5 dark:bg-primary/10 border-transparent shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
                                : 'hover:bg-primary/5 dark:hover:bg-primary/10 hover:shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
                            }`}
                          >
                            {/* Chevron */}
                            <td className="pl-3 pr-0 py-2.5 w-8">
                              <svg
                                className={`h-4 w-4 transition-all duration-200 ${isOpen ? 'rotate-90 text-primary' : 'text-muted-foreground group-hover:text-primary'}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </td>

                            {/* Статус */}
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[item.status]}`}>
                                <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[item.status]}`} />
                                {STATUS_LABEL[item.status]}
                              </span>
                            </td>

                            {/* Дата */}
                            <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap transition-colors group-hover:text-foreground/70">
                              {item.releaseDate || '—'}
                            </td>

                            {/* Платформа */}
                            <td className="px-3 py-2.5 text-sm font-medium text-foreground whitespace-nowrap transition-colors group-hover:text-primary">
                              {item.operator}
                            </td>

                            {/* Эмитент */}
                            <td className="px-3 py-2.5 max-w-[240px]">
                              <p className="text-sm font-medium text-foreground line-clamp-1 transition-colors group-hover:text-primary">
                                {item.name}
                              </p>
                            </td>

                            {/* % */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`font-bold text-sm transition-colors ${item.yieldNumeric > 0 ? 'text-green-600 dark:text-green-400 group-hover:text-green-500 dark:group-hover:text-green-300' : 'text-muted-foreground'}`}>
                                {item.yield}
                              </span>
                            </td>

                            {/* Начало */}
                            <td className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap transition-colors group-hover:text-foreground">
                              {item.placementStart || '—'}
                            </td>

                            {/* Конец */}
                            <td className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap transition-colors group-hover:text-foreground">
                              {item.placementEnd || '—'}
                            </td>

                            {/* Погашение */}
                            <td className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap transition-colors group-hover:text-foreground">
                              {item.maturityDate || '—'}
                            </td>
                          </tr>

                          {/* ── Панель с деталями ── */}
                          {isOpen && (
                            <tr className="border-b border-border bg-muted/20">
                              <td colSpan={COLS} className="px-5 py-4">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 text-sm mb-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Тип ЦФА</p>
                                    <p className="font-medium text-foreground">{item.type}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Срок</p>
                                    <p className="font-medium text-foreground">{item.term}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Softcap</p>
                                    <p className="font-medium text-foreground">{item.minAmount}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Hardcap</p>
                                    <p className="font-medium text-foreground">{item.hardcap || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Доступ</p>
                                    <p className="font-medium text-foreground">{item.access.join(', ')}</p>
                                  </div>
                                  {item.releaseDate && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">Дата регистрации</p>
                                      <p className="font-medium text-foreground">{item.releaseDate}</p>
                                    </div>
                                  )}
                                </div>

                                {item.description && (
                                  <div className="mb-4 rounded-lg bg-background border border-border px-4 py-3">
                                    <p className="text-xs text-muted-foreground mb-1">Доп. условия</p>
                                    <p className="text-sm text-foreground leading-relaxed">{item.description}</p>
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  {item.status === 'open' && item.yieldNumeric > 0 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setCalcItem(item); }}
                                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                                    >
                                      Рассчитать доходность
                                    </button>
                                  )}
                                  <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white hover:border-primary transition-all duration-150"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Решение о выпуске
                                  </a>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── MOBILE: карточки ── */}
        <div className="md:hidden">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : displayed.length === 0 ? (
            <div className="rounded-xl bg-card p-10 text-center text-muted-foreground">
              {search || statusFilter !== 'all'
                ? 'Ничего не найдено — измените фильтры'
                : 'Данные загружаются...'}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {displayed.map((item) => (
                <MobileCard key={item.id} item={item} onCalc={setCalcItem} />
              ))}
            </div>
          )}
        </div>

        {/* Пагинация */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Назад
            </button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Вперёд →
            </button>
          </div>
        )}

        {/* Сноска об источниках */}
        {!loading && items.length > 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Источники: цфа.рф · cbonds.ru · Обновляется каждый час
          </p>
        )}
      </div>

      {/* Калькулятор */}
      <Modal isOpen={calcItem !== null} onClose={() => setCalcItem(null)}>
        {calcItem && <Calculator item={calcItem} onClose={() => setCalcItem(null)} />}
      </Modal>
    </section>
  );
}
