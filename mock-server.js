/**
 * Моковый API-сервер для тестирования личного кабинета
 *
 * Запуск:  node mock-server.js
 * Порт:    8080  (соответствует NEXT_PUBLIC_API_GATEWAY_URL в .env.development)
 *
 * Тестовые учётные данные (любые, но удобные):
 *   email:    test@example.com
 *   password: password123
 */

const express = require("express");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const PORT = 8080;
const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── In-memory store ──────────────────────────────────────────────────────────

/** @type {Map<string, {id:string, email:string, firstName:string, lastName:string, phoneNumber:string|null, enabled:boolean, roles:string[], createdAt:string, password:string}>} */
const users = new Map();

/** @type {Map<string, string>} accessToken → userId */
const accessTokens = new Map();

/** @type {Map<string, string>} refreshToken → userId */
const refreshTokens = new Map();

// ─── Helper functions ─────────────────────────────────────────────────────────

function uid() {
  return crypto.randomUUID();
}

function token() {
  return crypto.randomBytes(32).toString("hex");
}

function getUserFromAccess(accessToken) {
  if (!accessToken) return null;
  const userId = accessTokens.get(accessToken);
  if (!userId) return null;

  for (const u of users.values()) {
    if (u.id === userId) return u;
  }
  return null;
}

function userToResponse(u) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phoneNumber: u.phoneNumber ?? null,
    enabled: u.enabled,
    roles: u.roles,
    createdAt: u.createdAt,
  };
}

// ─── Tokens management ────────────────────────────────────────────────────────

function issueTokens(res, userId) {
  const at = token();
  const rt = token();

  accessTokens.set(at, userId);
  refreshTokens.set(rt, userId);

  res.cookie("access_token", at, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 3600 * 1000, // 1 час
  });

  res.cookie("refresh_token", rt, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600 * 1000, // 30 дней
  });

  return { at, rt };
}

function clearTokens(res) {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
}

// ─── Предустановленный тестовый пользователь ───────────────────────────────────

const defaultUser = {
  id: "a1b2c3d4-0000-0000-0000-000000000001",
  email: "test@example.com",
  firstName: "Тест",
  lastName: "Пользователь",
  phoneNumber: "+79001234567",
  enabled: true,
  roles: ["ROLE_USER"],
  createdAt: new Date().toISOString(),
  password: "password123",
};
users.set(defaultUser.email, defaultUser);

// ─── Mock CFA data ────────────────────────────────────────────────────────────

const mockCfa = [
  {
    id: uid(),
    issuer_name: "ООО Финсет Капитал",
    inn: "7701234567",
    platform: "Атомайз",
    dfa_type: "облигация",
    status: "active",
    is_visible: true,
    confidence: 0.95,
    coupon_rate_type: "fixed",
    coupon_rate_fixed: 24.5,
    coupon_benchmark: null,
    issue_date: "2026-01-15",
    maturity_date: "2026-07-15",
    total_volume: 500_000_000,
    min_lot_rub: 10_000,
    ai_summary:
      "Надёжный эмитент с высоким кредитным рейтингом. Фиксированная ставка выше среднерыночной.",
    ai_facts: [
      { label: "Рейтинг", value: "A+" },
      { label: "Срок", value: "6 месяцев" },
      { label: "Выплата купона", value: "ежеквартально" },
    ],
    published_at: "2026-01-10T10:00:00Z",
  },
  {
    id: uid(),
    issuer_name: "ПАО СберБанк",
    inn: "7707083893",
    platform: "СберЦФА",
    dfa_type: "привязан к золоту",
    status: "active",
    is_visible: true,
    confidence: 0.98,
    coupon_rate_type: "floating",
    coupon_rate_fixed: null,
    coupon_benchmark: "Цена золота + 2%",
    issue_date: "2026-02-01",
    maturity_date: "2027-02-01",
    total_volume: 1_000_000_000,
    min_lot_rub: 5_000,
    ai_summary:
      "ЦФА с привязкой к стоимости золота. Доходность зависит от динамики цены металла на MOEX.",
    ai_facts: [
      { label: "Базовый актив", value: "Золото (XAU)" },
      { label: "Срок", value: "12 месяцев" },
      { label: "Риск", value: "рыночный" },
    ],
    published_at: "2026-01-25T09:00:00Z",
  },
  {
    id: uid(),
    issuer_name: "Т-Банк",
    inn: "7710140679",
    platform: "Токеон",
    dfa_type: "привязан к BTC",
    status: "active",
    is_visible: true,
    confidence: 0.87,
    coupon_rate_type: "floating",
    coupon_rate_fixed: null,
    coupon_benchmark: "Курс BTC/RUB",
    issue_date: "2026-03-01",
    maturity_date: "2026-09-01",
    total_volume: 300_000_000,
    min_lot_rub: 1_000,
    ai_summary:
      "Высокорисковый инструмент с потенциально высокой доходностью при росте биткоина.",
    ai_facts: [
      { label: "Базовый актив", value: "Bitcoin (BTC)" },
      { label: "Порог входа", value: "1 000 ₽" },
      { label: "Риск", value: "высокий" },
    ],
    published_at: "2026-02-20T12:00:00Z",
  },
  {
    id: uid(),
    issuer_name: "АО Металлоинвест",
    inn: "7707083000",
    platform: "Лайтхаус",
    dfa_type: "облигация",
    status: "active",
    is_visible: true,
    confidence: 0.91,
    coupon_rate_type: "fixed",
    coupon_rate_fixed: 22.0,
    coupon_benchmark: null,
    issue_date: "2026-01-20",
    maturity_date: "2026-10-20",
    total_volume: 200_000_000,
    min_lot_rub: 50_000,
    ai_summary:
      "Промышленный эмитент первого эшелона. Стабильные денежные потоки снижают кредитный риск.",
    ai_facts: [
      { label: "Отрасль", value: "Металлургия" },
      { label: "Рейтинг", value: "AA" },
      { label: "Срок", value: "9 месяцев" },
    ],
    published_at: "2026-01-15T08:00:00Z",
  },
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  const { email, password, firstName, lastName, phoneNumber } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email и password обязательны" });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Пароль минимум 8 символов" });
  }

  if (users.has(email)) {
    return res.status(409).json({ message: "User already exists" });
  }

  const newUser = {
    id: uid(),
    email,
    password,
    firstName: firstName || "",
    lastName: lastName || "",
    phoneNumber: phoneNumber || null,
    enabled: true,
    roles: ["ROLE_USER"],
    createdAt: new Date().toISOString(),
  };

  users.set(email, newUser);
  issueTokens(res, newUser.id);

  return res.status(201).json({
    userId: newUser.id,
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    roles: newUser.roles,
  });
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.get(email);

  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  issueTokens(res, user.id);
  return res.status(200).json({
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
  });
});

// POST /api/auth/refresh
app.post("/api/auth/refresh", async (req, res) => {
  const rt = req.cookies["refresh_token"];

  if (!rt) {
    return res.status(401).json({ message: "refresh_token не передан" });
  }

  const userId = refreshTokens.get(rt);
  if (!userId) {
    return res
      .status(401)
      .json({ message: "refresh_token недействителен или истёк" });
  }

  // Token rotation - удаляем старый
  refreshTokens.delete(rt);

  let user = null;
  for (const u of users.values()) {
    if (u.id === userId) {
      user = u;
      break;
    }
  }

  if (!user) {
    return res.status(401).json({ message: "Пользователь не найден" });
  }

  issueTokens(res, userId);
  return res.status(200).json({
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
  });
});

// POST /api/auth/logout
app.post("/api/auth/logout", async (req, res) => {
  const at = req.cookies["access_token"];
  const rt = req.cookies["refresh_token"];

  if (at) accessTokens.delete(at);
  if (rt) refreshTokens.delete(rt);

  clearTokens(res);
  res.status(204).send();
});

// GET /api/auth/me
app.get("/api/auth/me", async (req, res) => {
  const accessToken = req.cookies["access_token"];
  const user = getUserFromAccess(accessToken);

  if (!user) {
    return res.status(401).json({ message: "Не авторизован" });
  }

  return res.status(200).json(userToResponse(user));
});

// GET /api/cfa/active
app.get("/api/cfa/active", async (req, res) => {
  const accessToken = req.cookies["access_token"];
  const user = getUserFromAccess(accessToken);

  if (!user) {
    return res.status(401).json({ message: "Не авторизован" });
  }

  return res.status(200).json(mockCfa);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: `Маршрут ${req.method} ${req.url} не найден`,
    status: 404,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Ошибка сервера:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

// ─── Start server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Мок-сервер запущен на http://localhost:${PORT}`);
  console.log(`\nТестовый аккаунт:`);
  console.log(`  Email:    test@example.com`);
  console.log(`  Пароль:   password123`);
  console.log(`\nДоступные маршруты:`);
  console.log(`  POST  /api/auth/register`);
  console.log(`  POST  /api/auth/login`);
  console.log(`  POST  /api/auth/refresh`);
  console.log(`  POST  /api/auth/logout`);
  console.log(`  GET   /api/auth/me`);
  console.log(`  GET   /api/cfa/active`);
  console.log(`\nОстановить: Ctrl+C\n`);
});
