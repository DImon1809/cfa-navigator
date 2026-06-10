import type { CfaItem } from '@/lib/types';
import { createTransport, senderAddress } from '@/lib/mailer';
import { getSubscribers } from '@/lib/subscribers';

const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000';
const TG_CHANNEL = 'https://t.me/cfa_navigation_rf';

function buildUnsubscribeUrl(email: string): string {
  const token = Buffer.from(email).toString('base64url');
  return `${SITE_URL}/api/unsubscribe?token=${token}`;
}

function accessLabel(access: CfaItem['access']): string {
  if (access.includes('Неквал') && access.includes('Квал')) return 'Квал и неквал';
  if (access.includes('Неквал')) return 'Неквалифицированным инвесторам';
  return 'Только квалифицированным инвесторам';
}

function buildEmailHtml(cfa: CfaItem, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
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

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:20px 32px;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-.5px;">ЦФА.Навигатор</span>
              <span style="display:inline-block;margin-left:10px;background:#3b82f6;color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;vertical-align:middle;">Новый выпуск</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0 0 6px;font-size:15px;color:#64748b;">Появился новый выпуск ЦФА, который может вас заинтересовать:</p>
              <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">${accessLabel(cfa.access)}</p>

              <!-- CFA Card -->
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

              <!-- CTA Buttons -->
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

          <!-- Footer -->
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
}

export async function notifyNewCfa(newItems: CfaItem[]): Promise<void> {
  if (newItems.length === 0) return;

  const latest = newItems[newItems.length - 1];
  const subscribers = getSubscribers();
  if (subscribers.length === 0) return;

  const transporter = createTransport();
  const subject = `Новый выпуск ЦФА: ${latest.name}`;

  for (const email of subscribers) {
    const unsubscribeUrl = buildUnsubscribeUrl(email);
    await transporter
      .sendMail({
        from: senderAddress(),
        to: email,
        subject,
        html: buildEmailHtml(latest, unsubscribeUrl),
      })
      .catch((err) => {
        console.error(`[cfa-notify] Ошибка отправки на ${email}:`, err);
      });
  }

  console.log(`[cfa-notify] Отправлено ${subscribers.length} писем о "${latest.name}"`);
}
