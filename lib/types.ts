/**
 * Типы данных для ЦФА платформы
 */

/**
 * Статус выпуска ЦФА
 */
export type CfaStatus = 'open' | 'closed' | 'soon';

/**
 * Тип инвестора
 */
export type InvestorType = 'Неквал' | 'Квал';

/**
 * Основная структура данных ЦФА
 */
export interface CfaItem {
  id: string;
  name: string;
  shortName?: string;
  operator: string;
  platform: string;
  type: string;
  yield: string;
  yieldNumeric: number;
  term: string;
  termMonths: number;
  minAmount: string;
  minAmountNumeric: number;
  maxAmount?: string;
  access: InvestorType[];
  status: CfaStatus;
  badge?: string | null;
  rating?: number;
  reviewCount?: number;
  description?: string;
  features?: string[];
  releaseDate?: string;
  link: string;
  logoUrl?: string;
}

/**
 * Коллекция ЦФА с метаданными
 */
export interface CfaCollection {
  lastUpdate: string;
  items: CfaItem[];
}

/**
 * Параметры фильтрации ЦФА
 */
export interface CfaFilters {
  minYield: number;
  maxInvestment: number | null;
  operator: string | null;
  status: CfaStatus | 'all';
  searchQuery: string;
}

/**
 * Данные формы лидогенерации
 */
export interface LeadFormData {
  name: string;
  contact: string;
  amount: string;
  goal: string;
  term: string;
  comment?: string;
}

/**
 * Расширенная версия с метаданными для отправки
 */
export interface LeadFormPayload extends LeadFormData {
  timestamp: string;
  source: string;
}

/**
 * Опции для select полей формы
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * FAQ элемент
 */
export interface FaqItem {
  question: string;
  answer: string;
}
