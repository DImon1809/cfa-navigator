import type { CfaItem } from '@/lib/types';
import type { AggregatedResult, ParseResult } from './types';
import cfaData from '@/data/cfa.json';
import { parseTokeon } from './tokeon';
import { parseAtomyze } from './atomyze';
import { parseTbank } from './tbank';
import { parseCfahub } from './cfahub';

// In-memory cache — избегаем запуска браузера на каждый запрос
let cache: { result: AggregatedResult; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 час

const existingIds = new Set((cfaData as { items: { id: string }[] }).items.map((i) => i.id));

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
    access: item.access ?? ['Неквал', 'Квал'],
    status: item.status!,
    badge: item.badge ?? null,
    description: item.description,
    features: item.features,
    releaseDate: item.releaseDate,
    link: item.link!,
    logoUrl: item.logoUrl,
  };
}

function normalizeResults(results: ParseResult[]): { allItems: CfaItem[]; newItems: CfaItem[]; errors: string[] } {
  const errors: string[] = [];
  const allItems: CfaItem[] = [];
  const newItems: CfaItem[] = [];
  const seenIds = new Set<string>();

  for (const result of results) {
    if (result.error) errors.push(`[${result.source}] ${result.error}`);

    for (const partial of result.items) {
      if (!isCompleteItem(partial)) continue;
      if (seenIds.has(partial.id)) continue;

      const item = fillDefaults(partial);
      seenIds.add(item.id);
      allItems.push(item);

      if (!existingIds.has(item.id)) {
        newItems.push(item);
      }
    }
  }

  return { allItems, newItems, errors };
}

export async function parseAllSources(): Promise<AggregatedResult> {
  if (cache && Date.now() < cache.expiresAt) return cache.result;

  const fetchedAt = new Date().toISOString();

  // Запускаем все парсеры параллельно
  const results = await Promise.allSettled([parseTokeon(), parseAtomyze(), parseTbank(), parseCfahub()]);

  const parseResults: ParseResult[] = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const sources = ['tokeon', 'atomyze', 'tbank', 'cfahub'];
    return { items: [], source: sources[i], fetchedAt, error: String(r.reason) };
  });

  const { allItems, newItems, errors } = normalizeResults(parseResults);

  const result: AggregatedResult = { allItems, newItems, errors, fetchedAt };
  cache = { result, expiresAt: Date.now() + CACHE_TTL_MS };

  return result;
}

export function invalidateCache(): void {
  cache = null;
}

// Debug: возвращает сырые перехваченные JSON-ответы от каждого источника
export async function parseAllSourcesDebug(): Promise<ParseResult[]> {
  const fetchedAt = new Date().toISOString();
  const results = await Promise.allSettled([parseTokeon(), parseAtomyze(), parseTbank(), parseCfahub()]);
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const sources = ['tokeon', 'atomyze', 'tbank', 'cfahub'];
    return { items: [], source: sources[i], fetchedAt, error: String(r.reason) };
  });
}
