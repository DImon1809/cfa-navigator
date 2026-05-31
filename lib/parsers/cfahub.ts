import type { CfaItem, CfaStatus } from '@/lib/types';
import type { ParseResult } from './types';
import { getBrowser } from './browser';

const CFAHUB_URL = 'https://cfahub.ru';

// Возможные поля в JSON-ответе от ЦФА Хаб (обновить после первого запуска с capturedRaw)
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
  term?: string | number;
  maturity?: string;
  maturityDate?: string;
  minAmount?: string | number;
  minInvestment?: string | number;
  qualified?: boolean;
  qualifiedOnly?: boolean;
  forQual?: boolean;
  status?: string;
  state?: string;
  link?: string;
  url?: string;
  ticker?: string;
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
    if (!isNaN(n)) return n;
  }
  return 0;
}

function resolveStatus(status: string | undefined): CfaStatus {
  if (!status) return 'open';
  const s = status.toLowerCase();
  if (s.includes('open') || s.includes('active') || s.includes('activ') || s.includes('откр')) return 'open';
  if (s.includes('soon') || s.includes('coming') || s.includes('скор') || s.includes('ожид')) return 'soon';
  return 'closed';
}

function mapItem(raw: CfahubItem, index: number): Partial<CfaItem> {
  const yieldRaw = raw.yield ?? raw.profit ?? raw.return ?? raw.rate;
  const yieldNum = resolveNumber(yieldRaw);
  const yieldStr = yieldNum > 0 ? `${yieldNum}% годовых` : resolveString(yieldRaw);

  const minAmtRaw = raw.minAmount ?? raw.minInvestment;
  const minAmtNum = resolveNumber(minAmtRaw);

  const isQual = raw.qualified ?? raw.qualifiedOnly ?? raw.forQual ?? false;

  const name = resolveString(raw.name, raw.title, raw.emitent, raw.emitter, raw.issuer);
  const ticker = raw.ticker ? String(raw.ticker) : String(raw.id ?? index);

  return {
    id: `cfahub-${ticker}`,
    name,
    operator: resolveString(raw.operator, raw.platform, raw.emitent, raw.emitter, 'ЦФА Хаб'),
    platform: 'ЦФА ХАБ',
    type: 'ЦФА',
    yield: yieldStr,
    yieldNumeric: yieldNum,
    term: resolveString(raw.term, raw.maturity, raw.maturityDate),
    termMonths: 0,
    minAmount: minAmtNum > 0 ? `${minAmtNum.toLocaleString('ru-RU')} ₽` : resolveString(minAmtRaw),
    minAmountNumeric: minAmtNum,
    access: isQual ? ['Квал'] : ['Неквал', 'Квал'],
    status: resolveStatus(raw.status ?? raw.state),
    badge: null,
    link: resolveString(raw.link, raw.url, CFAHUB_URL),
  };
}

// Пытается найти массив ЦФА в произвольном JSON-ответе
function extractItemsFromJson(json: unknown): CfahubItem[] | null {
  if (Array.isArray(json) && json.length > 0) {
    const first = json[0] as Record<string, unknown>;
    if (typeof first === 'object' && first !== null) {
      const keys = Object.keys(first);
      const hasDfaFields = keys.some((k) =>
        ['name', 'title', 'yield', 'profit', 'emitent', 'issuer', 'ticker', 'status', 'rate'].includes(k)
      );
      if (hasDfaFields) return json as CfahubItem[];
    }
  }
  if (typeof json === 'object' && json !== null) {
    for (const val of Object.values(json as Record<string, unknown>)) {
      const result = extractItemsFromJson(val);
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
    try {
      const json = await response.json();
      capturedJson.push({ url: response.url(), data: json });
    } catch {
      // non-JSON despite header
    }
  });

  try {
    await page.goto(CFAHUB_URL, { waitUntil: 'networkidle', timeout: 30_000 });

    // Ждём появления карточек/элементов со списком ЦФА
    await page
      .waitForSelector('[class*="card"], [class*="item"], [class*="product"], li', {
        timeout: 8_000,
      })
      .catch(() => {});

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
      const cards = Array.from(
        document.querySelectorAll('[class*="card"], [class*="item"], [class*="product"]')
      );
      return cards
        .map((card) => ({
          name: card.querySelector('h2, h3, h4, [class*="title"], [class*="name"]')?.textContent?.trim(),
          yield: card.querySelector('[class*="yield"], [class*="profit"], [class*="rate"]')?.textContent?.trim(),
          term: card.querySelector('[class*="term"], [class*="period"], [class*="maturity"]')?.textContent?.trim(),
          status: card.querySelector('[class*="status"], [class*="badge"]')?.textContent?.trim(),
          link: (card.querySelector('a') as HTMLAnchorElement | null)?.href,
        }))
        .filter((item) => item.name);
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
          ? 'ЦФА Хаб: не удалось перехватить API-запросы и найти данные в DOM. Возможно, требуется авторизация.'
          : `ЦФА Хаб: перехвачено ${capturedJson.length} JSON-ответов, но ни один не содержит список ЦФА. Проверь capturedRaw для диагностики.`,
    };
  } catch (err) {
    return { items: [], source: 'cfahub', fetchedAt, error: `Ошибка скрейпинга ЦФА Хаб: ${err}` };
  } finally {
    await page.close();
  }
}
