// Парсер https://cbonds.ru/dfa/
// Данные за платным API — пробуем перехватить XHR и DOM, лучший результат.

import type { CfaItem, CfaStatus } from '@/lib/types';
import type { ParseResult } from './types';
import { getBrowser } from './browser';

const DFA_URL = 'https://cbonds.ru/dfa/';

interface CbondsItem {
  name?: string;
  fullName?: string;
  issuer?: string;
  operator?: string;
  platform?: string;
  ois?: string;
  coupon?: string | number;
  yield?: string | number;
  rate?: string | number;
  maturityDate?: string;
  placementEndDate?: string;
  issueDate?: string;
  minAmount?: string | number;
  volume?: string | number;
  status?: string;
  link?: string;
  isin?: string;
  id?: string | number;
  qualified?: boolean;
}

function resolveNumber(v: unknown): number {
  if (v === undefined || v === null) return 0;
  const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function resolveStatus(status: string | undefined, maturity?: string, placementEnd?: string): CfaStatus {
  if (!status) {
    const endStr = placementEnd ?? maturity;
    if (endStr) {
      const d = new Date(endStr);
      if (!isNaN(d.getTime())) return d > new Date() ? 'open' : 'closed';
    }
    return 'closed';
  }
  const s = status.toLowerCase();
  if (s.includes('activ') || s.includes('open') || s.includes('размеще') || s === 'active') return 'open';
  if (s.includes('upcoming') || s.includes('soon') || s.includes('ожид')) return 'soon';
  return 'closed';
}

function calcTermMonths(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
}

function formatTerm(months: number): string {
  if (months <= 0) return '—';
  if (months < 12) return `${months} мес.`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y} г. ${m} мес.` : `${y} г.`;
}

function mapCbondsItem(raw: CbondsItem, index: number): Partial<CfaItem> {
  const name = String(raw.name ?? raw.fullName ?? raw.issuer ?? `ЦФА #${index + 1}`);
  const operator = String(raw.operator ?? raw.platform ?? raw.ois ?? 'cbonds');
  const yieldNum = resolveNumber(raw.coupon ?? raw.yield ?? raw.rate);
  const minAmtNum = resolveNumber(raw.minAmount ?? raw.volume);
  const termMonths = calcTermMonths(raw.issueDate, raw.maturityDate ?? raw.placementEndDate);
  const status = resolveStatus(raw.status, raw.maturityDate, raw.placementEndDate);

  return {
    id: `cbonds-${raw.isin ?? raw.id ?? index}`,
    name,
    operator,
    platform: 'CBONDS',
    type: 'ЦФА',
    yield: yieldNum > 0 ? `${yieldNum}% годовых` : '—',
    yieldNumeric: yieldNum,
    term: termMonths > 0 ? formatTerm(termMonths) : '—',
    termMonths,
    minAmount: minAmtNum > 0 ? `${minAmtNum.toLocaleString('ru-RU')} ₽` : '—',
    minAmountNumeric: minAmtNum,
    access: raw.qualified ? ['Квал'] : ['Неквал', 'Квал'],
    status,
    badge: null,
    link: raw.link ?? DFA_URL,
    releaseDate: raw.issueDate,
  };
}

function extractFromXhr(capturedJson: { url: string; data: unknown }[]): CbondsItem[] | null {
  for (const { data } of capturedJson) {
    if (!data || typeof data !== 'object') continue;
    const candidates = Array.isArray(data) ? [data] : Object.values(data as Record<string, unknown>);
    for (const c of candidates) {
      if (!Array.isArray(c) || c.length === 0) continue;
      const first = c[0] as Record<string, unknown>;
      if (typeof first !== 'object' || first === null) continue;
      const keys = Object.keys(first).map((k) => k.toLowerCase());
      const hasDfaFields = keys.some((k) =>
        ['isin', 'coupon', 'yield', 'issuer', 'maturitydate', 'placementenddate'].includes(k)
      );
      if (hasDfaFields) return c as CbondsItem[];
    }
  }
  return null;
}

export async function parseCbonds(): Promise<ParseResult> {
  const fetchedAt = new Date().toISOString();
  const browser = await getBrowser();
  const page = await browser.newPage();
  const capturedJson: { url: string; data: unknown }[] = [];

  page.on('response', async (response) => {
    const ct = response.headers()['content-type'] ?? '';
    if (!ct.includes('application/json')) return;
    if (response.url().includes('/_next/') || response.url().includes('analytics')) return;
    try {
      const json = await response.json();
      capturedJson.push({ url: response.url(), data: json });
    } catch { /* ignore */ }
  });

  try {
    await page.goto(DFA_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await Promise.race([
      page.waitForSelector('table tbody tr, [class*="table"] [class*="row"]', { timeout: 12_000 }),
      page.waitForResponse(
        (r) => r.url().includes('cbonds') && r.status() === 200,
        { timeout: 12_000 }
      ),
    ]).catch(() => {});

    await page.waitForTimeout(1_500);
    await page.waitForLoadState('networkidle').catch(() => {});

    const xhrItems = extractFromXhr(capturedJson);
    if (xhrItems && xhrItems.length > 0) {
      return {
        items: xhrItems.map(mapCbondsItem),
        source: 'cbonds',
        fetchedAt,
        capturedRaw: capturedJson,
      };
    }

    // DOM-fallback: последние размещения из таблицы на странице
    const domRows = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll('table tbody tr, [class*="table"] [class*="row"]')
      );
      return rows
        .map((row) => {
          const cells = Array.from(row.querySelectorAll('td, [class*="cell"]')).map(
            (td) => td.textContent?.trim() ?? ''
          );
          const link = (row.querySelector('a') as HTMLAnchorElement | null)?.href ?? '';
          return { cells, link };
        })
        .filter((r) => r.cells.length >= 3 && r.cells.some((c) => c.length > 2));
    });

    if (domRows.length > 0) {
      const items = domRows.map((row, i): Partial<CfaItem> => ({
        id: `cbonds-dom-${i}`,
        name: row.cells[0] ?? `ЦФА #${i}`,
        operator: row.cells[1] ?? 'cbonds',
        platform: 'CBONDS',
        type: 'ЦФА',
        yield: '—',
        yieldNumeric: 0,
        term: '—',
        termMonths: 0,
        minAmount: '—',
        minAmountNumeric: 0,
        access: ['Неквал', 'Квал'],
        status: 'open',
        badge: null,
        link: row.link || DFA_URL,
      }));
      return { items, source: 'cbonds', fetchedAt, capturedRaw: capturedJson };
    }

    return {
      items: [],
      source: 'cbonds',
      fetchedAt,
      capturedRaw: capturedJson,
      error:
        'cbonds.ru: данные недоступны без авторизации или требуют платной подписки.',
    };
  } catch (err) {
    return { items: [], source: 'cbonds', fetchedAt, error: `Ошибка парсера cbonds: ${err}` };
  } finally {
    await page.close();
  }
}
