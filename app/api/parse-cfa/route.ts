import { NextRequest, NextResponse } from 'next/server';
import { parseAllSources, invalidateCache, parseAllSourcesDebug } from '@/lib/parsers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get('debug') === 'true';

  try {
    if (debug) {
      const raw = await parseAllSourcesDebug();
      return NextResponse.json(raw);
    }
    const result = await parseAllSources();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: 'Ошибка парсера', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// POST /api/parse-cfa — сброс кэша вручную
export async function POST() {
  invalidateCache();
  return NextResponse.json({ ok: true, message: 'Кэш сброшен' });
}
