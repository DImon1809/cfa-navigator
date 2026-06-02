import { chromium, Browser } from 'playwright';

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) return browserInstance;

  browserInstance = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// Graceful shutdown — закрываем браузер при завершении процесса
const shutdown = () => { closeBrowser().catch(() => {}); };
process.once('beforeExit', shutdown);
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
