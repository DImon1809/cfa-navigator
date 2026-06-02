import type { CfaItem, CfaStatus } from '@/lib/types';
import type { ParseResult } from './types';
import { getBrowser } from './browser';

const CFAHUB_URL = 'https://cfahub.ru';

// Возможные поля в JSON-ответе от ЦФА Хаб (гибкая схема — поля уточняются по capturedRaw)
interface CfahubItem {
  id?: string | number;
  name?: string;
  title?: string;
  emitent?: string;
  emitter?: string;
  issuer?: string;
  platform?: string;
  operator?: string;
  yield?: string | number;
  profit?: string | number;
  return?: string | number;
  rate?: string | number;
  coupon?: string | number;
  term?: string | number;
  maturity?: string;
  maturityDate?: string;
  endDate?: string;
  minAmount?: string | number;
  minInvestment?: string | number;
  minSum?: string | number;
  qualified?: boolean;
  qualifiedOnly?: boolean;
  forQual?: boolean;
  isQualified?: boolean;
  status?: string;
  state?: string;
  active?: boolean;
  link?: string;
  url?: string;
  ticker?: string;
  isin?: string;
  type?: string;
  kind?: string;
}

function resolveString(
  ...candidates: (string | number | undefined | null)[]
): string {
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).trim() !== '') return String(c).trim();
  }
  return '—';
}

function resolveNumber(
  ...candidates: (string | number | undefined | null)[]
): number {
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    const n = parseFloat(String(c).replace(',', '.').replace('%', '').replace(/[^\d.]/g, ''));
    if (!isNaN(n) && n > 0) return n;
  }
  return 0;
}

function resolveStatus(status: string | undefined, active?: boolean): CfaStatus {
  if (active === true) return 'open';
  if (active === false) return 'closed';
  if (!status) return 'open';
  const s = status.toLowerCase();
  if (s.includes('open') || s.includes('active') || s.includes('activ') || s.includes('откр') || s === 'registered') return 'open';
  if (s.includes('soon') || s.includes('coming') || s.includes('скор') || s.includes('ожид') || s === 'unissued') return 'soon';
  return 'closed';
}

function mapItem(raw: CfahubItem, index: number): Partial<CfaItem> {
  const yieldRaw = raw.yield ?? raw.profit ?? raw.return ?? raw.rate ?? raw.coupon;
  const yieldNum = resolveNumber(yieldRaw);
  const yieldStr = yieldNum > 0 ? `${yieldNum}% годовых` : resolveString(yieldRaw);

  const minAmtRaw = raw.minAmount ?? raw.minInvestment ?? raw.minSum;
  const minAmtNum = resolveNumber(minAmtRaw);

  const isQual = raw.qualified ?? raw.qualifiedOnly ?? raw.forQual ?? raw.isQualified ?? false;

  const name = resolveString(raw.name, raw.title, raw.emitent, raw.emitter, raw.issuer);
  const ticker = raw.ticker ?? raw.isin ?? String(raw.id ?? index);

  return {
    id: `cfahub-${ticker}`,
    name,
    operator: resolveString(raw.operator, raw.platform, raw.emitent, raw.emitter, 'ЦФА Хаб'),
    platform: 'ЦФА ХАБ',
    type: resolveString(raw.type, raw.kind, 'ЦФА'),
    yield: yieldStr,
    yieldNumeric: yieldNum,
    term: resolveString(raw.term, raw.maturity, raw.maturityDate, raw.endDate),
    termMonths: 0,
    minAmount: minAmtNum > 0 ? `${minAmtNum.toLocaleString('ru-RU')} ₽` : resolveString(minAmtRaw),
    minAmountNumeric: minAmtNum,
    access: isQual ? ['Квал'] : ['Неквал', 'Квал'],
    status: resolveStatus(raw.status ?? raw.state, raw.active),
    badge: null,
    link: resolveString(raw.link, raw.url, CFAHUB_URL),
  };
}

// Пытается найти массив ЦФА в произвольном JSON-ответе (рекурсивно)
function extractItemsFromJson(json: unknown, depth = 0): CfahubItem[] | null {
  if (depth > 4) return null;
  if (Array.isArray(json) && json.length > 0) {
    const first = json[0] as Record<string, unknown>;
    if (typeof first === 'object' && first !== null) {
      const keys = Object.keys(first);
      const hasDfaFields = keys.some((k) =>
        ['name', 'title', 'yield', 'profit', 'coupon', 'emitent', 'issuer', 'ticker', 'isin', 'status', 'rate'].includes(k.toLowerCase())
      );
      if (hasDfaFields) return json as CfahubItem[];
    }
  }
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    for (const val of Object.values(json as Record<string, unknown>)) {
      const result = extractItemsFromJson(val, depth + 1);
      if (result) return result;
    }
  }
  return null;
}

export async function parseCfahub(): Promise<ParseResult> {
  const fetchedAt = new Date().toISOString();
  const browser = await getBrowser();
  const page = await browser.newPage();

  const capturedJson: { url: string; data: unknown }[] = [];

  page.on('response', async (response) => {
    const ct = response.headers()['content-type'] ?? '';
    if (!ct.includes('application/json')) return;
    // Пропускаем стандартные ресурсы Next.js/_next/
    if (response.url().includes('/_next/')) return;
    try {
      const json = await response.json();
      capturedJson.push({ url: response.url(), data: json });
    } catch {
      // non-JSON despite header
    }
  });

  try {
    await page.goto(CFAHUB_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Ждём появления динамических данных (несколько стратегий)
    await Promise.race([
      page.waitForSelector('[class*="card"], [class*="item"], [class*="product"], [class*="dfa"], [class*="issue"]', { timeout: 12_000 }),
      page.waitForResponse((r) => r.url().includes('/api/') && r.status() === 200, { timeout: 12_000 }),
    ]).catch(() => {});

    // Дополнительная пауза для XHR-запросов после рендеринга
    await page.waitForTimeout(2_000);

    // Повторная проверка — некоторые SPA подгружают данные с задержкой
    await page.waitForLoadState('networkidle').catch(() => {});

    // Ищем ЦФА-данные в перехваченных JSON-ответах
    for (const captured of capturedJson) {
      const items = extractItemsFromJson(captured.data);
      if (items && items.length > 0) {
        return {
          items: items.map(mapItem),
          source: 'cfahub',
          fetchedAt,
          capturedRaw: capturedJson,
        };
      }
    }

    // Fallback: пробуем собрать данные из DOM
    const domItems = await page.evaluate(() => {
      const selectors = [
        '[class*="card"]',
        '[class*="item"]',
        '[class*="product"]',
        '[class*="dfa" i]',
        '[class*="issue" i]',
        'li[class]',
      ];
      const cards: Element[] = [];
      for (const sel of selectors) {
        const found = Array.from(document.querySelectorAll(sel));
        // Берём только те, у которых есть текстовый контент (не пустые контейнеры)
        const nonEmpty = found.filter((el) => (el.textContent?.trim().length ?? 0) > 10);
        if (nonEmpty.length > 0) { cards.push(...nonEmpty); break; }
      }

      return cards
        .map((card) => ({
          name: card.querySelector('h1, h2, h3, h4, [class*="title" i], [class*="name" i]')?.textContent?.trim(),
          yield: card.querySelector('[class*="yield" i], [class*="profit" i], [class*="rate" i], [class*="доход" i]')?.textContent?.trim(),
          term: card.querySelector('[class*="term" i], [class*="period" i], [class*="maturity" i], [class*="срок" i]')?.textContent?.trim(),
          status: card.querySelector('[class*="status" i], [class*="badge" i], [class*="state" i]')?.textContent?.trim(),
          link: (card.querySelector('a') as HTMLAnchorElement | null)?.href,
        }))
        .filter((item) => item.name && item.name.length > 2);
    });

    if (domItems.length > 0) {
      return {
        items: domItems.map((item, i) =>
          mapItem(
            {
              name: item.name ?? undefined,
              yield: item.yield ?? undefined,
              term: item.term ?? undefined,
              status: item.status ?? undefined,
              link: item.link ?? undefined,
            },
            i
          )
        ),
        source: 'cfahub',
        fetchedAt,
        capturedRaw: capturedJson,
      };
    }

    // Нет данных — возвращаем пустой результат с capturedRaw для диагностики
    return {
      items: [],
      source: 'cfahub',
      fetchedAt,
      capturedRaw: capturedJson,
      error:
        capturedJson.length === 0
          ? 'ЦФА Хаб: не удалось перехватить API-запросы и найти данные в DOM. Возможно, требуется авторизация или сайт недоступен.'
          : `ЦФА Хаб: перехвачено ${capturedJson.length} JSON-ответов, но ни один не содержит список ЦФА. Проверь capturedRaw через /api/parse-cfa?debug=true`,
    };
  } catch (err) {
    return { items: [], source: 'cfahub', fetchedAt, error: `Ошибка скрейпинга ЦФА Хаб: ${err}` };
  } finally {
    await page.close();
  }
}
