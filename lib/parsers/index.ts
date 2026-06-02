import type { CfaItem } from '@/lib/types';
import type { AggregatedResult, ParseResult } from './types';
import { parseCfarfpage } from './cfarfpage';

const PARSER_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number, source: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`[${source}] Таймаут ${ms / 1000}s`)),
      ms
    );
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

function isCompleteItem(item: Partial<CfaItem>): item is CfaItem {
  return !!(item.id && item.name && item.operator && item.platform && item.status && item.link);
}

function fillDefaults(item: Partial<CfaItem>): CfaItem {
  return {
    id: item.id!,
    name: item.name!,
    shortName: item.shortName,
    operator: item.operator!,
    platform: item.platform!,
    type: item.type ?? 'ЦФА',
    yield: item.yield ?? '—',
    yieldNumeric: item.yieldNumeric ?? 0,
    term: item.term ?? '—',
    termMonths: item.termMonths ?? 0,
    minAmount: item.minAmount ?? '—',
    minAmountNumeric: item.minAmountNumeric ?? 0,
    hardcap: item.hardcap,
    hardcapNumeric: item.hardcapNumeric,
    access: item.access ?? ['Неквал', 'Квал'],
    status: item.status!,
    badge: item.badge ?? null,
    description: item.description,
    features: item.features,
    releaseDate: item.releaseDate,
    placementStart: item.placementStart,
    placementEnd: item.placementEnd,
    maturityDate: item.maturityDate,
    link: item.link!,
    logoUrl: item.logoUrl,
  };
}

function normalizeResults(results: ParseResult[], fetchedAt: string): AggregatedResult {
  const errors: string[] = [];
  const allItems: CfaItem[] = [];
  const seenIds = new Set<string>();

  for (const result of results) {
    if (result.error) errors.push(`[${result.source}] ${result.error}`);
    for (const partial of result.items) {
      if (!isCompleteItem(partial)) continue;
      if (seenIds.has(partial.id)) continue;
      const item = fillDefaults(partial);
      seenIds.add(item.id);
      allItems.push(item);
    }
  }

  return { allItems, newItems: [], errors, fetchedAt };
}

export async function parseAllSources(): Promise<AggregatedResult> {
  const fetchedAt = new Date().toISOString();
  const settled = await Promise.allSettled([
    withTimeout(parseCfarfpage(), PARSER_TIMEOUT_MS, 'cfarfpage'),
  ]);
  const parseResults: ParseResult[] = settled.map((r) => {
    if (r.status === 'fulfilled') return r.value;
    return { items: [], source: 'cfarfpage', fetchedAt, error: String(r.reason) };
  });
  return normalizeResults(parseResults, fetchedAt);
}

export async function parseAllSourcesDebug(): Promise<ParseResult[]> {
  const fetchedAt = new Date().toISOString();
  const settled = await Promise.allSettled([
    withTimeout(parseCfarfpage(), PARSER_TIMEOUT_MS, 'cfarfpage'),
  ]);
  return settled.map((r) => {
    if (r.status === 'fulfilled') return r.value;
    return { items: [], source: 'cfarfpage', fetchedAt, error: String(r.reason) };
  });
}
