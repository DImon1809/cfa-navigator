import { NextRequest, NextResponse } from 'next/server';
import { parseAllSources, parseAllSourcesDebug } from '@/lib/parsers';
import { readStore, writeStore, clearMemoryStore } from '@/lib/parsers/store';
import { notifyNewCfa } from '@/lib/cfa-notify';

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

// POST /api/parse-cfa              — принудительное обновление (сбрасывает кэш и парсит заново)
// POST /api/parse-cfa?test=true   — то же + рассылка по последнему ЦФА без проверки на новизну
export async function POST(req: NextRequest) {
  const isTest = req.nextUrl.searchParams.get('test') === 'true';

  try {
    // Читаем старые данные до сброса, чтобы найти новые ЦФА
    const prevStore = await readStore();
    const prevIds = new Set((prevStore?.allItems ?? []).map((i) => i.id));

    clearMemoryStore();
    const result = await parseAllSources();
    await writeStore(result);

    // Уведомляем подписчиков о новых выпусках (fire-and-forget)
    const freshItems = isTest
      ? result.allItems.slice(-1)
      : result.allItems.filter((i) => !prevIds.has(i.id));

    if (freshItems.length > 0) {
      notifyNewCfa(freshItems).catch((err) =>
        console.error('[parse-cfa] Ошибка рассылки:', err)
      );
    }

    return NextResponse.json({
      ok: true,
      items: result.allItems.length,
      newItems: freshItems.length,
      testMode: isTest || undefined,
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
