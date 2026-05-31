'use client';

import { useEffect, useState } from 'react';
import type { CfaItem } from '@/lib/types';
import type { AggregatedResult } from '@/lib/parsers/types';

const STATUS_COLORS = {
  open: 'bg-green-100 text-green-700',
  soon: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS = { open: 'Открыто', soon: 'Скоро', closed: 'Закрыто' };

function NewCfaCard({ item }: { item: CfaItem }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="flex-1 text-sm font-semibold text-foreground line-clamp-2">{item.name}</h3>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}>
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      <div className="mb-2 text-xs text-muted-foreground">{item.operator} • {item.platform}</div>

      <div className="mb-3">
        <div className="text-xl font-bold text-green-600">{item.yield}</div>
        <div className="text-xs text-muted-foreground">{item.type}</div>
      </div>

      <div className="space-y-1 border-t border-border pt-2 text-xs">
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

      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block w-full rounded-lg border border-primary px-3 py-1.5 text-center text-xs font-medium text-primary hover:bg-primary hover:text-white transition-colors"
        >
          Подробнее →
        </a>
      )}
    </div>
  );
}

export function LiveCfaFeed() {
  const [data, setData] = useState<AggregatedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <h2 className="text-xl font-bold text-foreground">Живые данные с платформ</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            Не удалось получить данные с платформ: {error}
          </div>
        </div>
      </section>
    );
  }

  if (!data) return null;

  const pool = data.newItems.length > 0 ? data.newItems : data.allItems;
  const sorted = [...pool].sort((a, b) => {
    const order = { open: 0, soon: 1, closed: 2 };
    return (order[a.status] ?? 2) - (order[b.status] ?? 2);
  });
  const displayItems = sorted.filter(i => i.status === 'open' || i.status === 'soon').slice(0, 12);
  const openCount = pool.filter(i => i.status === 'open').length;

  if (displayItems.length === 0) return null;

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Актуальные выпуски ЦФА
              {openCount > 0 && <span className="ml-2 text-sm font-normal text-green-600">{openCount} открыто для покупки</span>}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-muted-foreground">
                Обновлено: {lastRefresh.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={fetchData}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              Обновить
            </button>
          </div>
        </div>

        {data.errors.filter(e => !e.includes('авторизованный')).length > 0 && (
          <div className="mb-4 rounded-lg bg-yellow-50 px-4 py-2 text-xs text-yellow-700">
            Некоторые источники недоступны: {data.errors.filter(e => !e.includes('авторизованный')).join(' | ')}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayItems.map((item) => (
            <NewCfaCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
