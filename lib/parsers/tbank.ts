import type { CfaItem, CfaStatus } from '@/lib/types';
import type { ParseResult } from './types';
import { getBrowser } from './browser';

const DFA_PAGE_URL = 'https://www.tbank.ru/invest/dfa/';

// T-Invest REST API — резервный режим при наличии TINVEST_TOKEN в .env
const TINVEST_BASE = 'https://invest-public-api.tinkoff.ru/rest';
const BONDS_ENDPOINT = `${TINVEST_BASE}/tinkoff.public.invest.api.contract.v1.InstrumentsService/Bonds`;

// ─── T-Invest API types ───────────────────────────────────────────────────────

interface TInvestQuotation {
  units: string;
  nano: number;
}

interface TInvestBond {
  figi: string;
  ticker: string;
  classCode: string;
  lot: number;
  name: string;
  couponQuantityPerYear: number;
  maturityDate?: string;
  nominal?: TInvestQuotation;
  placementDate?: string;
  placementPrice?: TInvestQuotation;
  tradingStatus: string;
  forQualInvestorFlag: boolean;
  uid: string;
  sector?: string;
}

interface TInvestBondsResponse {
  instruments: TInvestBond[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function quotationToNumber(q: TInvestQuotation | undefined): number {
  if (!q) return 0;
  return parseFloat(q.units) + q.nano / 1e9;
}

function tradingStatusToStatus(status: string): CfaStatus {
  if (status === 'TRADING_STATUS_NORMAL_TRADING') return 'open';
  if (status.includes('NOT_AVAILABLE') || status.includes('CLOSED')) return 'closed';
  return 'soon';
}

function calcTermMonths(maturity?: string, placement?: string): number {
  if (!maturity) return 0;
  const end = new Date(maturity);
  const start = placement ? new Date(placement) : new Date();
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
}

function formatTerm(months: number): string {
  if (months <= 0) return '—';
  if (months < 12) return `${months} мес.`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y} г. ${m} мес.` : `${y} г.`;
}

function isDfa(bond: TInvestBond): boolean {
  const name = bond.name.toUpperCase();
  return (
    name.includes('ЦФА') ||
    name.includes('ЦИФРОВОЙ') ||
    bond.ticker.startsWith('DFA') ||
    bond.classCode === 'DFLQ' ||
    bond.sector === 'financial_dfa'
  );
}

function mapBond(bond: TInvestBond): Partial<CfaItem> {
  const termMonths = calcTermMonths(bond.maturityDate, bond.placementDate);
  const minAmtNum = quotationToNumber(bond.placementPrice) * bond.lot;
  return {
    id: `tbank-${bond.ticker.toLowerCase()}`,
    name: bond.name,
    operator: 'Т-Банк (Atomyze)',
    platform: 'Т-ИНВЕСТИЦИИ',
    type: 'ЦФА',
    yield: bond.couponQuantityPerYear > 0 ? `${bond.couponQuantityPerYear} выплат/год` : '—',
    yieldNumeric: 0,
    term: formatTerm(termMonths),
    termMonths,
    minAmount: minAmtNum > 0 ? `${minAmtNum.toLocaleString('ru-RU')} ₽` : '—',
    minAmountNumeric: minAmtNum,
    access: bond.forQualInvestorFlag ? ['Квал'] : ['Неквал', 'Квал'],
    status: tradingStatusToStatus(bond.tradingStatus),
    badge: null,
    link: `${DFA_PAGE_URL}${bond.figi}`,
    releaseDate: bond.placementDate,
  };
}

// ─── T-Invest API mode (requires TINVEST_TOKEN) ───────────────────────────────

async function parseViaApi(token: string, fetchedAt: string): Promise<ParseResult> {
  let data: TInvestBondsResponse;
  try {
    const res = await fetch(BONDS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ instrumentStatus: 'INSTRUMENT_STATUS_ALL' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    data = (await res.json()) as TInvestBondsResponse;
  } catch (err) {
    return { items: [], source: 'tbank', fetchedAt, error: `T-Invest API ошибка: ${err}` };
  }

  if (!Array.isArray(data.instruments)) {
    return { items: [], source: 'tbank', fetchedAt, error: 'T-Invest: неожиданная структура ответа' };
  }

  const dfaBonds = data.instruments.filter(isDfa);
  return {
    items: dfaBonds.map(mapBond),
    source: 'tbank',
    fetchedAt,
    capturedRaw: [{ url: BONDS_ENDPOINT, data: { total: data.instruments.length, dfa: dfaBonds.length } }],
  };
}

// ─── Playwright XHR-intercept mode (без авторизации) ─────────────────────────

// Пытается распознать DFA-объект из произвольного XHR-ответа страницы Т-Банка
function extractDfaFromCapture(url: string, json: unknown): Partial<CfaItem>[] | null {
  const items = Array.isArray(json)
    ? json
    : typeof json === 'object' && json !== null
      ? Object.values(json as Record<string, unknown>).find((v) => Array.isArray(v)) ?? null
      : null;

  if (!Array.isArray(items) || items.length === 0) return null;

  const first = items[0] as Record<string, unknown>;
  // Ориентируемся по характерным полям ЦФА
  const looksLikeDfa =
    'figi' in first ||
    'ticker' in first ||
    'name' in first ||
    'maturityDate' in first ||
    'yield' in first;

  if (!looksLikeDfa) return null;

  return (items as Record<string, unknown>[]).map((raw, i): Partial<CfaItem> => {
    const name = String(raw.name ?? raw.title ?? raw.description ?? `ЦФА #${i + 1}`);
    const figi = String(raw.figi ?? raw.id ?? i);
    const termMonths = raw.maturityDate
      ? calcTermMonths(String(raw.maturityDate), raw.placementDate ? String(raw.placementDate) : undefined)
      : 0;
    const minAmtNum = raw.minPrice
      ? parseFloat(String(raw.minPrice))
      : raw.nominal
        ? parseFloat(String((raw.nominal as Record<string, unknown>).value ?? raw.nominal))
        : 0;
    const yieldNum =
      typeof raw.yield === 'number'
        ? raw.yield
        : typeof raw.yield === 'string'
          ? parseFloat(raw.yield.replace(',', '.'))
          : 0;

    return {
      id: `tbank-${figi}`,
      name,
      operator: 'Т-Банк (Atomyze)',
      platform: 'Т-ИНВЕСТИЦИИ',
      type: 'ЦФА',
      yield: yieldNum > 0 ? `${yieldNum}% годовых` : '—',
      yieldNumeric: yieldNum,
      term: formatTerm(termMonths),
      termMonths,
      minAmount: minAmtNum > 0 ? `${minAmtNum.toLocaleString('ru-RU')} ₽` : '—',
      minAmountNumeric: minAmtNum,
      access: raw.forQualInvestor ? ['Квал'] : ['Неквал', 'Квал'],
      status:
        raw.status === 'active' || raw.tradingStatus === 'TRADING_STATUS_NORMAL_TRADING'
          ? 'open'
          : raw.status === 'soon' || raw.status === 'upcoming'
            ? 'soon'
            : 'closed',
      badge: null,
      link: raw.url ? String(raw.url) : `${DFA_PAGE_URL}${figi}`,
    };
  });
}

async function parseViaPlaywright(fetchedAt: string): Promise<ParseResult> {
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
      // не JSON
    }
  });

  try {
    await page.goto(DFA_PAGE_URL, { waitUntil: 'networkidle', timeout: 30_000 });

    // Ждём появления карточек ЦФА
    await page
      .waitForSelector('[class*="dfa"], [class*="DFA"], [class*="card"], [class*="Card"]', {
        timeout: 10_000,
      })
      .catch(() => {});

    // Ищем DFA-данные в перехваченных XHR
    for (const captured of capturedJson) {
      const items = extractDfaFromCapture(captured.url, captured.data);
      if (items && items.length > 0) {
        return { items, source: 'tbank', fetchedAt, capturedRaw: capturedJson };
      }
    }

    // Fallback: DOM-скрейпинг карточек
    const domItems = await page.evaluate((pageUrl: string) => {
      const cards = Array.from(
        document.querySelectorAll('[class*="dfa" i], [class*="card" i], [data-qa*="dfa" i]')
      );
      return cards
        .map((card) => ({
          name: card.querySelector('h2, h3, h4, [class*="title" i], [class*="name" i]')?.textContent?.trim(),
          yield: card.querySelector('[class*="yield" i], [class*="profit" i], [class*="rate" i]')?.textContent?.trim(),
          term: card.querySelector('[class*="term" i], [class*="period" i], [class*="maturity" i], [class*="срок" i]')?.textContent?.trim(),
          minAmount: card.querySelector('[class*="min" i], [class*="amount" i], [class*="сумм" i]')?.textContent?.trim(),
          status: card.querySelector('[class*="status" i], [class*="badge" i]')?.textContent?.trim(),
          link: (card.querySelector('a') as HTMLAnchorElement | null)?.href ?? pageUrl,
        }))
        .filter((item) => item.name);
    }, DFA_PAGE_URL);

    if (domItems.length > 0) {
      return {
        items: domItems.map(
          (item, i): Partial<CfaItem> => ({
            id: `tbank-dom-${i}`,
            name: item.name!,
            operator: 'Т-Банк (Atomyze)',
            platform: 'Т-ИНВЕСТИЦИИ',
            type: 'ЦФА',
            yield: item.yield ?? '—',
            yieldNumeric: 0,
            term: item.term ?? '—',
            termMonths: 0,
            minAmount: item.minAmount ?? '—',
            minAmountNumeric: 0,
            access: ['Неквал', 'Квал'],
            status: 'open',
            badge: null,
            link: item.link ?? DFA_PAGE_URL,
          })
        ),
        source: 'tbank',
        fetchedAt,
        capturedRaw: capturedJson,
      };
    }

    return {
      items: [],
      source: 'tbank',
      fetchedAt,
      capturedRaw: capturedJson,
      error:
        capturedJson.length === 0
          ? 'Т-Банк: страница не вернула XHR-данных и не содержит карточек ЦФА в DOM'
          : `Т-Банк: перехвачено ${capturedJson.length} XHR-ответов, но DFA-данные не распознаны — проверь capturedRaw`,
    };
  } catch (err) {
    return { items: [], source: 'tbank', fetchedAt, error: `Ошибка скрейпинга Т-Банк: ${err}` };
  } finally {
    await page.close();
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function parseTbank(): Promise<ParseResult> {
  const fetchedAt = new Date().toISOString();
  const token = process.env.TINVEST_TOKEN;

  // Если есть токен — используем официальный API (точнее и полнее)
  if (token) return parseViaApi(token, fetchedAt);

  // Иначе — Playwright XHR-перехват публичной страницы
  return parseViaPlaywright(fetchedAt);
}
