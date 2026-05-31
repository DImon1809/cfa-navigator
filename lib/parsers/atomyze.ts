import type { CfaItem, CfaStatus } from '@/lib/types';
import type { ParseResult } from './types';
import { getBrowser } from './browser';

const RELEASES_URL = 'https://atomyze.ru/oper-docs/releases';

interface ScrapedRelease {
  ticker: string;
  emitter: string;
  date: string;
  status: CfaStatus;
  docUrl: string;
}

function mapRelease(r: ScrapedRelease): Partial<CfaItem> {
  return {
    id: `atomyze-${r.ticker.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: `ЦФА ${r.emitter} (${r.ticker})`,
    operator: 'Атомайз',
    platform: 'АТОМАЙЗ',
    type: 'Долговой ЦФА',
    yield: '—',
    yieldNumeric: 0,
    term: '—',
    termMonths: 0,
    minAmount: '—',
    minAmountNumeric: 0,
    access: ['Квал'],
    status: r.status,
    badge: null,
    link: r.docUrl || RELEASES_URL,
    releaseDate: r.date,
  };
}

function tableIndexToStatus(index: number): CfaStatus {
  if (index === 0) return 'open';
  return 'closed';
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

    const releases = await page.evaluate((openStatus: CfaStatus) => {
      const tables = Array.from(document.querySelectorAll('table'));
      const result: ScrapedRelease[] = [];

      tables.forEach((table, tableIndex) => {
        const status: CfaStatus = tableIndex === 0 ? openStatus : 'closed';
        if (status !== 'open') return;

        const rows = Array.from(table.querySelectorAll('tbody tr'));
        rows.forEach((row) => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length < 3) return;

          const emitter = cells[1]?.textContent?.trim() ?? '';
          const ticker = cells[2]?.textContent?.trim() ?? '';
          const docUrl = (cells[3]?.querySelector('a') as HTMLAnchorElement | null)?.href ?? '';
          const date = cells[5]?.textContent?.trim() ?? cells[4]?.textContent?.trim() ?? '';

          if (ticker) {
            result.push({ ticker, emitter, date, status, docUrl });
          }
        });
      });

      return result;
    }, 'open' as CfaStatus);

    const items = releases.map(mapRelease);

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
