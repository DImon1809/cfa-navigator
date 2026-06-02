import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { AggregatedResult } from './types';

// Увеличивай при изменении структуры CfaItem — кэш в памяти и на диске
// автоматически инвалидируется при несовпадении версии
const STORE_VERSION = 3;

const DATA_DIR = process.env.CFA_DATA_DIR ?? os.tmpdir();
const DATA_FILE = path.join(DATA_DIR, 'cfa-live.json');

interface StoredEntry {
  version: number;
  data: AggregatedResult;
}

// Память хранит версию вместе с данными
let memoryEntry: StoredEntry | null = null;

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readStore(): Promise<AggregatedResult | null> {
  // Проверяем версию в памяти — если устарела, сбрасываем
  if (memoryEntry) {
    if (memoryEntry.version !== STORE_VERSION) {
      memoryEntry = null;
    } else {
      return memoryEntry.data;
    }
  }

  // Читаем файл
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as StoredEntry;
    if (parsed.version !== STORE_VERSION) return null;
    memoryEntry = parsed;
    return parsed.data;
  } catch {
    return null;
  }
}

export async function writeStore(data: AggregatedResult): Promise<void> {
  const entry: StoredEntry = { version: STORE_VERSION, data };
  memoryEntry = entry;
  try {
    await ensureDir();
    await fs.writeFile(DATA_FILE, JSON.stringify(entry), 'utf-8');
  } catch (err) {
    console.error('[store] Не удалось записать файл:', err);
  }
}

export function getMemoryStore(): AggregatedResult | null {
  if (memoryEntry?.version !== STORE_VERSION) return null;
  return memoryEntry?.data ?? null;
}

export function clearMemoryStore(): void {
  memoryEntry = null;
}
