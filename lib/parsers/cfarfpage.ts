// Парсер данных с цфа.рф
// Данные хранятся как CSV: https://chat.xn--80a3bf.xn--p1ai/releases.csv
// Разделитель: ; Кодировка: UTF-8 BOM

import type { CfaItem, CfaStatus } from '@/lib/types';
import type { ParseResult } from './types';

const CSV_URL = 'https://chat.xn--80a3bf.xn--p1ai/releases.csv';

const FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/csv,text/plain,*/*',
  Referer: 'https://xn--80a3bf.xn--p1ai/',
};

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCSVLine(line: string, delimiter = ';'): string[] {
  const result: string[] = [];
  let i = 0;
  let field = '';
  let inQuotes = false;

  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i += 2;
      } else if (ch === '"') {
        inQuotes = false;
        i++;
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        result.push(field.trim());
        field = '';
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }
  result.push(field.trim());
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseRuDate(s: string): Date | null {
  if (!s) return null;
  // DD.MM.YYYY (берём первую часть если диапазон "DD.MM.YYYY - DD.MM.YYYY")
  const clean = s.split(/[-–]/)[0].trim();
  const m = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
}

function parseMoney(s: string): number {
  if (!s) return 0;
  // Убираем "ЦФА", пробелы, заменяем запятую на точку
  const cleaned = s.replace(/цфа/gi, '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseYieldNum(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace('%', '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function calcTermMonths(startStr: string, endStr: string): number {
  const start = parseRuDate(startStr);
  const end = parseRuDate(endStr);
  if (!start || !end) return 0;
  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  );
}

function formatTerm(months: number): string {
  if (months <= 0) return '—';
  if (months < 12) return `${months} мес.`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y} г. ${m} мес.` : `${y} г.`;
}

function deriveStatus(placementStartStr: string, placementEndStr: string, maturityStr: string): CfaStatus {
  const now = new Date();
  const placementEnd = parseRuDate(placementEndStr);
  const placementStart = parseRuDate(placementStartStr);
  const maturity = parseRuDate(maturityStr);

  if (placementEnd) {
    if (placementEnd >= now) return 'open';
  }
  if (placementStart && !placementEnd) {
    if (placementStart > now) return 'soon';
    if (placementStart >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)) return 'open';
  }
  if (maturity && maturity > now && !placementEnd && !placementStart) {
    // Нет дат размещения, но срок не истёк — считаем открытым
    return 'open';
  }
  return 'closed';
}

function isQualOnly(additionalTerms: string): boolean {
  const t = additionalTerms.toLowerCase();
  return (
    (t.includes('квалифицированных инвесторов') || t.includes('только для квалифицир')) &&
    !t.includes('неквалифицированных')
  );
}

// ─── Маппинг строки ──────────────────────────────────────────────────────────
// Колонки: [0]=№ [1]=Платформа [2]=Дата [3]=Эмитент [4]=Softcap [5]=Hardcap
//          [6]=% [7]=НачалоРазм [8]=КонецРазм [9]=Погашение [10]=Тип [11]=ДопУсл [12]=Решение

function mapRow(cols: string[], rowIdx: number): Partial<CfaItem> | null {
  const rowNum = cols[0] || String(rowIdx);
  const platform = cols[1]?.trim() || 'Неизвестно';
  const date = cols[2]?.trim() || '';
  const emitter = cols[3]?.trim() || '';
  if (!emitter || emitter.length < 2) return null;

  const softcap = parseMoney(cols[4] ?? '');
  const hardcap = parseMoney(cols[5] ?? '');
  const yieldNum = parseYieldNum(cols[6] ?? '');
  const placementStart = cols[7]?.trim() ?? '';
  const placementEnd = cols[8]?.trim() ?? '';
  const maturity = cols[9]?.trim() ?? '';
  const cfaType = cols[10]?.trim() || 'Долговой ЦФА';
  const additionalTerms = cols[11]?.trim() ?? '';
  const link = cols[12]?.trim() || `https://xn--80a3bf.xn--p1ai`;

  const termRef = maturity || placementEnd;
  const termStart = placementStart || date;
  const termMonths = calcTermMonths(termStart, termRef);
  const status = deriveStatus(placementStart, placementEnd, maturity);

  const qualOnly = isQualOnly(additionalTerms) || additionalTerms.toLowerCase().includes('только квал');

  return {
    id: `cfarfpage-${rowNum}`,
    name: emitter,
    operator: platform,
    platform: platform.toUpperCase(),
    type: cfaType,
    yield: yieldNum > 0 ? `${yieldNum}% годовых` : '—',
    yieldNumeric: yieldNum,
    term: termMonths > 0 ? formatTerm(termMonths) : (maturity || '—'),
    termMonths,
    minAmount: softcap > 0 ? `${softcap.toLocaleString('ru-RU')} ₽` : '—',
    minAmountNumeric: softcap,
    hardcap: hardcap > 0 ? `${hardcap.toLocaleString('ru-RU')} ₽` : '—',
    hardcapNumeric: hardcap,
    access: qualOnly ? ['Квал'] : ['Неквал', 'Квал'],
    status,
    badge: null,
    link,
    releaseDate: date || undefined,
    placementStart: placementStart || undefined,
    placementEnd: placementEnd || undefined,
    maturityDate: maturity || undefined,
    description: additionalTerms ? additionalTerms.slice(0, 300) : undefined,
  };
}

// ─── Основная функция ─────────────────────────────────────────────────────────

export async function parseCfarfpage(): Promise<ParseResult> {
  const fetchedAt = new Date().toISOString();

  let csvText: string;
  try {
    const res = await fetch(CSV_URL, { headers: FETCH_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csvText = await res.text();
  } catch (err) {
    return { items: [], source: 'cfarfpage', fetchedAt, error: `Ошибка загрузки CSV: ${err}` };
  }

  // Убираем BOM и нормализуем переносы строк
  const normalized = csvText.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((l) => l.trim());

  if (lines.length < 2) {
    return { items: [], source: 'cfarfpage', fetchedAt, error: 'CSV пустой или не содержит данных' };
  }

  // Пропускаем заголовок (lines[0])
  const items: Partial<CfaItem>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const item = mapRow(cols, i);
    if (item) items.push(item);
  }

  return {
    items,
    source: 'cfarfpage',
    fetchedAt,
    capturedRaw: [{ url: CSV_URL, data: { total: lines.length - 1, parsed: items.length } }],
  };
}
