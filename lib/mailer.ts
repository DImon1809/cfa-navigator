import nodemailer from 'nodemailer';

export function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: Number(SMTP_PORT ?? 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export function senderAddress() {
  return `"ЦФА.Навигатор" <${process.env.SMTP_USER}>`;
}
