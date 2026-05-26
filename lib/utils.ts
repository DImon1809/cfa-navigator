import { clsx, type ClassValue } from "clsx";

/**
 * Утилита для объединения классов Tailwind с поддержкой условной логики
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Форматирование числа в рублях
 */
export function formatRubles(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Форматирование процентов
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Парсинг доходности из строки (например "До +34%" -> 34)
 */
export function parseYield(yieldStr: string): number {
  const match = yieldStr.match(/[-+]?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Парсинг суммы из строки (например "1 000 ₽" -> 1000)
 */
export function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * Парсинг срока в месяцах (например "6 мес." -> 6)
 */
export function parseTermMonths(termStr: string): number {
  const match = termStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Scroll to element by ID
 */
export function scrollToElement(elementId: string) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
