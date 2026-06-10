import { NextRequest, NextResponse } from 'next/server';
import { createTransport, senderAddress } from '@/lib/mailer';

const ADMIN_EMAIL = process.env.CHAT_LOG_TO ?? 'klimovd131@gmail.com';
const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000';

function unsubscribePageHtml(email: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Отписка от рассылки — ЦФА.Навигатор</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#fff;border-radius:12px;padding:40px 48px;max-width:480px;width:100%;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.1)}
    .icon{font-size:48px;margin-bottom:16px}
    h1{font-size:22px;color:#0f172a;margin-bottom:12px}
    p{font-size:14px;color:#64748b;line-height:1.6;margin-bottom:20px}
    .email{font-weight:600;color:#334155}
    a{display:inline-block;margin-top:8px;padding:10px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Вы отписались от рассылки</h1>
    <p>Адрес <span class="email">${email}</span> больше не будет получать уведомления о новых выпусках ЦФА.</p>
    <p>Вы всегда можете следить за новинками в нашем Telegram-канале.</p>
    <a href="${SITE_URL}">Вернуться на сайт</a>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';

  let email = '';
  try {
    email = Buffer.from(token, 'base64url').toString('utf-8');
    if (!email.includes('@') || email.length > 254) throw new Error('invalid');
  } catch {
    return new NextResponse('<p>Неверная или устаревшая ссылка для отписки.</p>', {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Уведомляем администратора (fire-and-forget)
  const date = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  createTransport()
    .sendMail({
      from: senderAddress(),
      to: ADMIN_EMAIL,
      subject: `[Рассылка] Отписка: ${email}`,
      text: `Пользователь отказался от рассылки ЦФА.Навигатор.\n\nEmail: ${email}\nДата: ${date} МСК`,
    })
    .catch((err) => console.error('[unsubscribe] Ошибка уведомления администратора:', err));

  return new NextResponse(unsubscribePageHtml(email), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
