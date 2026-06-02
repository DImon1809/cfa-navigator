import { NextRequest, NextResponse } from 'next/server';
import { parseAllSources, parseAllSourcesDebug } from '@/lib/parsers';
import { readStore, writeStore, clearMemoryStore } from '@/lib/parsers/store';

export const dynamic = 'force-dynamic';

// GET /api/parse-cfa        — вернуть актуальные данные из store
// GET /api/parse-cfa?debug  — запустить парсеры напрямую и вернуть сырые данные
export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get('debug') === 'true';

  if (debug) {
    try {
      const raw = await parseAllSourcesDebug();
      return NextResponse.json(raw);
    } catch (err) {
      return NextResponse.json(
        { error: 'Ошибка парсера', detail: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      );
    }
  }

  try {
    // Читаем из store (память → файл)
    const stored = await readStore();
    // Возвращаем кэш только если он содержит реальные данные
    if (stored && stored.allItems.length > 0) return NextResponse.json(stored);

    // Store пуст или содержит только ошибки — запускаем парсеры
    const result = await parseAllSources();
    await writeStore(result);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: 'Ошибка получения данных', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// POST /api/parse-cfa — принудительное обновление (сбрасывает кэш и парсит заново)
export async function POST() {
  try {
    clearMemoryStore();
    const result = await parseAllSources();
    await writeStore(result);
    return NextResponse.json({
      ok: true,
      items: result.allItems.length,
      errors: result.errors,
      fetchedAt: result.fetchedAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Ошибка обновления', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
