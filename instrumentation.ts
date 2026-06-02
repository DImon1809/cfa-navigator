const INTERVAL_MS = 60 * 60 * 1000; // 1 час

// Вызывается один раз при старте Next.js-сервера (только Node.js runtime, не Edge)
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { parseAllSources } = await import('@/lib/parsers');
  const { writeStore } = await import('@/lib/parsers/store');

  const run = async () => {
    console.log('[cron] Запуск парсеров ЦФА...');
    try {
      const result = await parseAllSources();
      await writeStore(result);
      console.log(
        `[cron] Готово: ${result.allItems.length} позиций, ошибок: ${result.errors.length}`
      );
    } catch (err) {
      console.error('[cron] Критическая ошибка парсера:', err);
    }
  };

  // Первый запуск — сразу при старте сервера
  run();

  // Повторяем каждый час
  setInterval(run, INTERVAL_MS);
}
