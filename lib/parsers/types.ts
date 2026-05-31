import type { CfaItem } from '@/lib/types';

export interface ParseResult {
  items: Partial<CfaItem>[];
  source: string;
  fetchedAt: string;
  error?: string;
  capturedRaw?: { url: string; data: unknown }[];
}

export interface AggregatedResult {
  allItems: CfaItem[];
  newItems: CfaItem[];
  errors: string[];
  fetchedAt: string;
}
