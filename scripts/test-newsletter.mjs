/**
 * Тест рассылки: отправляет письмо точно как с прода.
 * Запуск: node scripts/test-newsletter.mjs
 *
 * Берёт последний открытый ЦФА из стора, строит HTML-письмо
 * с продакшен-доменом и шлёт на klimovd131@gmail.com.
 */

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ── Конфиг ───────────────────────────────────────────────────────────────────
const SMTP_HOST  = 'smtp.mail.ru';
const SMTP_PORT  = 465;
const SMTP_USER  = 'cfa.navigator@mail.ru';
const SMTP_PASS  = 'JbTQ7PxLQIJRJSXQXmqt';
const FROM       = `"ЦФА.Навигатор" <${SMTP_USER}>`;
const TO         = 'klimovd131@gmail.com';
const SITE_URL   = process.env.SITE_URL ?? 'http://localhost:3000';
const TG_CHANNEL = 'https://t.me/cfa_navigation_rf';

// ── Читаем стор ──────────────────────────────────────────────────────────────
const storePath = path.join(os.tmpdir(), 'cfa-live.json');
const raw = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
const allItems = raw.data.allItems;

const openItems = allItems.filter(i => i.status === 'open');
const cfa = openItems.length > 0
  ? openItems[openItems.length - 1]
  : allItems[allItems.length - 1];

console.log(`Используем ЦФА: ${cfa.name} (${cfa.operator}, ${cfa.status})`);

// ── Ссылка отписки ───────────────────────────────────────────────────────────
const token = Buffer.from(TO).toString('base64url');
const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${token}`;

// ── HTML-шаблон (идентичен lib/cfa-notify.ts) ────────────────────────────────
function accessLabel(access) {
  if (access.includes('Неквал') && access.includes('Квал')) return 'Квал и неквал';
  if (access.includes('Неквал')) return 'Неквалифицированным инвесторам';
  return 'Только квалифицированным инвесторам';
}

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Новый выпуск ЦФА</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,.1);">

          <tr>
            <td style="background:#0f172a;padding:20px 32px;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-.5px;">ЦФА.Навигатор</span>
              <span style="display:inline-block;margin-left:10px;background:#3b82f6;color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;vertical-align:middle;">Новый выпуск</span>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0 0 6px;font-size:15px;color:#64748b;">Появился новый выпуск ЦФА, который может вас заинтересовать:</p>
              <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">${accessLabel(cfa.access)}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 2px;font-size:19px;font-weight:700;color:#0f172a;line-height:1.3;">${cfa.name}</p>
                    <p style="margin:0 0 18px;font-size:13px;color:#64748b;">${cfa.operator}${cfa.platform && cfa.platform !== cfa.operator ? ' · ' + cfa.platform : ''}</p>
                    <table cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td style="padding-right:20px;vertical-align:top;">
                          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;font-weight:600;">Доходность</p>
                          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#16a34a;">${cfa.yield}</p>
                        </td>
                        <td style="padding-right:20px;vertical-align:top;">
                          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;font-weight:600;">Срок</p>
                          <p style="margin:4px 0 0;font-size:18px;font-weight:600;color:#0f172a;">${cfa.term}</p>
                        </td>
                        <td style="vertical-align:top;">
                          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;font-weight:600;">Мин. сумма</p>
                          <p style="margin:4px 0 0;font-size:18px;font-weight:600;color:#0f172a;">${cfa.minAmount}</p>
                        </td>
                      </tr>
                    </table>
                    ${cfa.type ? `<p style="margin:16px 0 0;font-size:13px;color:#475569;background:#e2e8f0;display:inline-block;padding:3px 10px;border-radius:4px;">${cfa.type}</p>` : ''}
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${SITE_URL}" style="display:inline-block;background:#0f172a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px;">Смотреть на сайте</a>
                  </td>
                  <td>
                    <a href="${TG_CHANNEL}" style="display:inline-block;background:#0088cc;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px;">Telegram-канал</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
                Вы получили это письмо, так как подписаны на рассылку ЦФА.Навигатор.<br>
                <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Отказаться от рассылки</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ── Отправка ──────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: SMTP_HOST, port: SMTP_PORT, secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

const info = await transporter.sendMail({
  from: FROM,
  to: TO,
  subject: `Новый выпуск ЦФА: ${cfa.name}`,
  html,
});

console.log('Отправлено:', info.messageId);
console.log('Получатель:', TO);
