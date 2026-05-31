import type { CfaItem, CfaStatus } from '@/lib/types';
import type { ParseResult } from './types';

const API_URL = 'https://partnerapi.tokeon.ru/dfa';
const RELEASE_URL = (ticker: string) => `https://tokeon.ru/releases/${ticker}`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://tokeon.ru/vypuski',
};

interface TokeonItem {
  dfa_id: string;
  kind: string;
  ticker: string;
  state: string;
  dfa_name: string;
  emitent_shortname: string;
  precision: number;
  only_prof: boolean;
  is_available: boolean;
  maturity_day: string;
  profit_percent: { value?: string; hint?: string } | string | number;
  data_params: {
    emission_price?: number;
    min_amount_per_request?: number;
    dfa_listing_start_date?: string;
    dfa_listing_end_date?: string;
    planned_redeem_date?: string;
    profit_percent?: number;
  };
}

function stateToStatus(state: string): CfaStatus {
  if (state === 'registered') return 'open';
  if (state === 'unissued') return 'soon';
  return 'closed';
}

function kindToType(kind: string): string {
  if (kind === 'debt_schedule_fixed_amount') return 'Фиксированная доходность';
  if (kind === 'gcp') return 'ГЦП';
  return 'Долговой ЦФА';
}

function parseYield(pp: TokeonItem['profit_percent']): { yieldStr: string; yieldNumeric: number } {
  if (typeof pp === 'object' && pp !== null && 'value' in pp && pp.value) {
    const num = parseFloat(pp.value.replace(',', '.').replace('%', ''));
    return { yieldStr: `${pp.value} годовых`, yieldNumeric: isNaN(num) ? 0 : num };
  }
  if (typeof pp === 'number' && pp > 0) {
    return { yieldStr: `${pp}% годовых`, yieldNumeric: pp };
  }
  return { yieldStr: '—', yieldNumeric: 0 };
}

function parseTerm(maturityDay: string): { termStr: string; termMonths: number } {
  const match = maturityDay.match(/(\d+)/);
  if (!match) return { termStr: '—', termMonths: 0 };
  const days = parseInt(match[1]);
  const months = Math.round(days / 30);
  return { termStr: maturityDay.trim(), termMonths: months };
}

function mapItem(raw: TokeonItem): Partial<CfaItem> {
  const { yieldStr, yieldNumeric } = parseYield(raw.profit_percent);
  const { termStr, termMonths } = parseTerm(raw.maturity_day ?? '');
  const minAmountRaw = raw.data_params?.min_amount_per_request ?? raw.data_params?.emission_price ?? 0;

  return {
    id: `tokeon-${raw.ticker}`,
    name: raw.dfa_name,
    operator: 'Токеон',
    platform: 'ТОКЕОН',
    type: kindToType(raw.kind),
    yield: yieldStr,
    yieldNumeric,
    term: termStr || '—',
    termMonths,
    minAmount: minAmountRaw > 0 ? `${minAmountRaw.toLocaleString('ru-RU')} ₽` : '—',
    minAmountNumeric: minAmountRaw,
    access: raw.only_prof ? ['Квал'] : ['Неквал', 'Квал'],
    status: stateToStatus(raw.state),
    badge: null,
    link: RELEASE_URL(raw.ticker),
    releaseDate: raw.data_params?.dfa_listing_start_date,
  };
}

export async function parseTokeon(): Promise<ParseResult> {
  const fetchedAt = new Date().toISOString();

  let data: TokeonItem[];
  try {
    const res = await fetch(API_URL, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json() as TokeonItem[];
  } catch (err) {
    return { items: [], source: 'tokeon', fetchedAt, error: `Ошибка API: ${err}` };
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { items: [], source: 'tokeon', fetchedAt, error: 'Пустой ответ от API' };
  }

  const items = data.map(mapItem);

  return {
    items,
    source: 'tokeon',
    fetchedAt,
    capturedRaw: [{ url: API_URL, data: { total: data.length } }],
  };
}
