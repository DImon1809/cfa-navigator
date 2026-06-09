import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CHAT_LOG_TO } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !CHAT_LOG_TO) {
    return NextResponse.json({ error: "SMTP not configured" }, { status: 500 });
  }

  let email: string;
  try {
    const body = await request.json();
    email = body.email?.trim();
    if (!email) throw new Error("no email");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: Number(SMTP_PORT ?? 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const date = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

  try {
    await transporter.sendMail({
      from: `"ЦФА.Навигатор" <${SMTP_USER}>`,
      to: CHAT_LOG_TO,
      subject: `[Рассылка] Новый подписчик: ${email}`,
      text: `Пользователь подписался на рассылку о новых выпусках ЦФА.\n\nEmail: ${email}\nДата: ${date} MSK\n\nTelegram-канал для рассылки: https://t.me/cfa_navigation_rf`,
    });
  } catch (err) {
    console.error("[newsletter] smtp error", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
