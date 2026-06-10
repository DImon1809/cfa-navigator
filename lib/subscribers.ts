const DEV_EMAIL = 'klimovd131@gmail.com';

export function getSubscribers(): string[] {
  if (process.env.NODE_ENV !== 'production') {
    return [DEV_EMAIL];
  }
  const raw = process.env.NEWSLETTER_EMAILS ?? '';
  const list = raw.split(',').map((e) => e.trim()).filter(Boolean);
  return list.length > 0 ? list : [DEV_EMAIL];
}
