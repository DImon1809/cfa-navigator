import type { CfaItem, CfaStatus } from '@/lib/types';
import type { ParseResult } from './types';
import { getBrowser } from './browser';

const RELEASES_URL = 'https://atomyze.ru/oper-docs/releases';

interface ScrapedRelease {
  ticker: string;
  emitter: string;
  date: string;
  maturityDate: string;
  yieldStr: string;
  status: CfaStatus;
  docUrl: string;
}

function calcTermMonths(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
}

function formatTerm(months: number): string {
  if (months <= 0) return '—';
  if (months < 12) return `${months} мес.`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y} г. ${m} мес.` : `${y} г.`;
}

function mapRelease(r: ScrapedRelease): Partial<CfaItem> {
  const termMonths = calcTermMonths(r.date, r.maturityDate);
  return {
    id: `atomyze-${r.ticker.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: `ЦФА ${r.emitter} (${r.ticker})`,
    operator: 'Атомайз',
    platform: 'АТОМАЙЗ',
    type: 'Долговой ЦФА',
    yield: r.yieldStr || '—',
    yieldNumeric: 0,
    term: termMonths > 0 ? formatTerm(termMonths) : (r.maturityDate ? r.maturityDate : '—'),
    termMonths,
    minAmount: '—',
    minAmountNumeric: 0,
    access: ['Квал'],
    status: r.status,
    badge: null,
    link: r.docUrl || RELEASES_URL,
    releaseDate: r.date,
  };
}

// Пытается найти данные о выпусках в XHR-ответах Atomyze
function extractFromXhr(capturedJson: { url: string; data: unknown }[]): ScrapedRelease[] | null {
  for (const { data } of capturedJson) {
    if (!data || typeof data !== 'object') continue;
    // Ищем массив с полями, похожими на ЦФА-выпуски
    const candidates = Array.isArray(data) ? data : Object.values(data as Record<string, unknown>);
    for (const candidate of candidates) {
      if (!Array.isArray(candidate) || candidate.length === 0) continue;
      const first = candidate[0] as Record<string, unknown>;
      if (typeof first !== 'object' || first === null) continue;
      const keys = Object.keys(first);
      const isDfaList = keys.some((k) =>
        ['ticker', 'symbol', 'isin', 'emitter', 'emitent', 'issuer'].includes(k.toLowerCase())
      );
      if (!isDfaList) continue;

      return (candidate as Record<string, unknown>[]).map((item, i): ScrapedRelease => ({
        ticker: String(item.ticker ?? item.symbol ?? item.isin ?? `#${i}`),
        emitter: String(item.emitter ?? item.emitent ?? item.issuer ?? item.name ?? ''),
        date: String(item.issueDate ?? item.placementDate ?? item.date ?? ''),
        maturityDate: String(item.maturityDate ?? item.redeemDate ?? item.endDate ?? ''),
        yieldStr: item.yield ? `${item.yield}% годовых` : item.coupon ? `${item.coupon}% годовых` : '—',
        status: (item.status === 'active' || item.status === 'open' || item.state === 'registered')
          ? 'open'
          : (item.status === 'upcoming' || item.state === 'unissued') ? 'soon' : 'closed',
        docUrl: String(item.url ?? item.link ?? item.docUrl ?? RELEASES_URL),
      }));
    }
  }
  return null;
}

export async function parseAtomyze(): Promise<ParseResult> {
  const fetchedAt = new Date().toISOString();
  const browser = await getBrowser();
  const page = await browser.newPage();

  const capturedJson: { url: string; data: unknown }[] = [];

  page.on('response', async (response) => {
    const ct = response.headers()['content-type'] ?? '';
    if (!ct.includes('application/json')) return;
    try {
      const json = await response.json();
      capturedJson.push({ url: response.url(), data: json });
    } catch {
      // non-JSON despite content-type header
    }
  });

  try {
    await page.goto(RELEASES_URL, { waitUntil: 'networkidle', timeout: 30_000 });

    // Wait for at least one table row to appear
    await page.waitForSelector('table tbody tr', { timeout: 10_000 }).catch(() => {});

    // Сначала пробуем извлечь данные из XHR
    const xhrItems = extractFromXhr(capturedJson);
    if (xhrItems && xhrItems.length > 0) {
      return {
        items: xhrItems.map(mapRelease),
        source: 'atomyze',
        fetchedAt,
        capturedRaw: capturedJson,
      };
    }

    // Fallback: DOM-парсинг таблиц — собираем ВСЕ таблицы (open + closed)
    const releases = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'));
      const result: Array<{
        ticker: string;
        emitter: string;
        date: string;
        maturityDate: string;
        yieldStr: string;
        status: string;
        docUrl: string;
      }> = [];

      tables.forEach((table, tableIndex) => {
        const status = tableIndex === 0 ? 'open' : 'closed';
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        rows.forEach((row) => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length < 3) return;

          const emitter = cells[1]?.textContent?.trim() ?? '';
          const ticker = cells[2]?.textContent?.trim() ?? '';
          const docUrl = (cells[3]?.querySelector('a') as HTMLAnchorElement | null)?.href ?? '';
          // Пытаемся найти дату размещения и дату погашения в разных столбцах
          const date = cells[4]?.textContent?.trim() ?? '';
          const maturityDate = cells[5]?.textContent?.trim() ?? '';
          // Ищем доходность в любом столбце (строки типа "12%", "12,5% годовых")
          let yieldStr = '—';
          for (const cell of cells) {
            const text = cell.textContent?.trim() ?? '';
            if (/\d[\d,.]*\s*%/.test(text) && text.length < 30) {
              yieldStr = text;
              break;
            }
          }

          if (ticker) {
            result.push({ ticker, emitter, date, maturityDate, yieldStr, status, docUrl });
          }
        });
      });

      return result;
    });

    const items = releases.map((r) =>
      mapRelease({ ...r, status: r.status as CfaStatus })
    );

    return {
      items,
      source: 'atomyze',
      fetchedAt,
      capturedRaw: [
        ...capturedJson,
        { url: RELEASES_URL, data: { scraped: releases.length } },
      ],
    };
  } catch (err) {
    return { items: [], source: 'atomyze', fetchedAt, error: `Ошибка скрейпинга Atomyze: ${err}` };
  } finally {
    await page.close();
  }
}
