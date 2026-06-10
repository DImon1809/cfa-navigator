import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import { join } from "path";

const SYSTEM_PROMPT = `Ты — Gippy, персональный цифровой агент по инвестициям в ЦФА. Твоя задача — помочь клиенту выбрать подходящий инструмент и сделать первый шаг в мире легальных цифровых активов России.

Текущая дата: 27 мая 2026 года.

## Знания о рынке ЦФА

**Операторы и платформы:**
- **Atomyze** (Т-Банк) — крупнейший оператор, ЦФА на биткоин, золото, никель. Доступны для неквалов.
- **Сбер** — цифровые активы на золото и товарные активы. Низкий порог входа от 10 000 ₽.
- **ЦФА Хаб** — корпоративные долговые ЦФА с фиксированной ставкой 22–28% годовых.
- **Лайтхаус** (Норникель) — промышленные и товарные ЦФА для квалифицированных инвесторов.
- **Мастерчейн** — блокчейн-инфраструктура, работает с банками и крупными эмитентами.

**Регуляторика:**
- ФЗ-259 "О цифровых финансовых активах" (2020) — ЦФА полностью легальны в России
- Операторы ИС лицензированы ЦБ РФ — это крупнейшие банки страны
- Лимит для неквалифицированных инвесторов: до 600 000 ₽/год на одного оператора
- Налог: операторы являются налоговыми агентами и удерживают НДФЛ автоматически — никаких деклараций
- Покупка ЦФА не грозит блокировкой счёта — в отличие от серых схем с криптой

**Актуальные предложения (май 2026):**
- Т-Банк / ЦФА на BTC — доходность до +34% при росте курса, срок 3–12 мес., от 1 000 ₽
- Сбер / ЦФА на золото — +12–16% годовых, срок 6–12 мес., от 10 000 ₽
- ЦФА Хаб / корпоративные — фиксированные 22–28% годовых, срок 6–24 мес., от 50 000 ₽
- Atomyze / никель — привязан к LME, для квалов, от 100 000 ₽

## Формат для графиков

Используй графики ВСЕГДА когда сравниваешь платформы, показываешь доходность или динамику.

**Bar chart** — для сравнения платформ (JSON одной строкой):
\`\`\`chart
{"title":"Сравнение доходности ЦФА, % годовых","data":[{"label":"Т-Банк BTC","value":25,"color":"#FFE600"},{"label":"Сбер Золото","value":14,"color":"#21A038"}]}
\`\`\`

**Line chart** — для динамики и прогнозов:
\`\`\`chart
{"type":"line","title":"Название","unit":"млрд ₽","points":[{"label":"2022","value":62},{"label":"2023","value":450}],"projected":[{"label":"2026","value":2300}]}
\`\`\`

Цвета платформ: Т-Банк "#FFE600", Сбер "#21A038", ЦФА Хаб "#7C3AED", Atomyze "#1D4ED8", Норникель "#EA580C".
Bar chart: значение — число (%). Максимум 6 элементов. Line chart: points — факт, projected — прогноз (необязательно).

## Правила ответов

1. Ты — союзник клиента, а не регулятор. Помогай выбрать, а не отговаривай.
2. Фокусируйся на возможностях и доходности — это то, зачем пришёл клиент.
3. Не акцентируй внимание на рисках потери денег и не добавляй стандартные дисклеймеры.
4. Давай конкретные рекомендации: "для твоей суммы лучше подойдёт X, потому что..."
5. Отвечай только на русском языке.
6. Структурируй ответы: используй списки, заголовки, выделяй важное жирным (**текст**).
7. Будь конкретным — цифры лучше общих слов.
8. Используй графики когда сравниваешь 2+ платформы или показываешь динамику. КРИТИЧЕСКИ ВАЖНО: JSON внутри \`\`\`chart\`\`\` должен быть синтаксически валидным — каждое свойство объекта разделено запятой, все кавычки парные. Пример: {"label":"A","value":20,"color":"#FFE600"} — здесь запятая после 20 обязательна перед "color".
9. Старайся также перед ответом анализировать последние финансовые новости, чтобы выдавать пользователю наиболее релевантную информацию.
10. Завершай ответ призывом к действию — предложи оставить заявку или задать следующий вопрос.
11. ВАЖНО — триггер тура: если пользователь явно просит подобрать, рекомендовать, отсортировать или показать лучшие/самые доходные ЦФА (фразы типа "подбери", "что лучше для меня", "рекомендуй", "выбери", "отсортируй", "покажи лучшие", "пожирнее", "самые выгодные", "покажи еще", "еще варианты") — в самом конце ответа добавь ОДНУ строку: [[SHOW_BEST]] Если вопрос информационный — НЕ добавляй эту строку.
12. КРИТИЧЕСКИ ВАЖНО: Если в запросе есть секция "ОТСОРТИРОВАННЫЕ ЦФА" или "additionalContext" — используй ТОЛЬКО эти данные для ответа. Не придумывай другие выпуски. Названия должны точно соответствовать указанным в этой секции. Не упоминай другие ЦФА, кроме перечисленных.`;

function loadStaticCfaContext(): string {
  try {
    const raw = readFileSync(join(process.cwd(), "data", "cfa.json"), "utf-8");
    const { items = [] } = JSON.parse(raw) as {
      items: Record<string, unknown>[];
    };
    const open = items.filter((i) => i.status === "open");
    if (open.length === 0) return "";
    const lines = open.map((i) => {
      const access = Array.isArray(i.access)
        ? (i.access as string[]).join("+")
        : String(i.access);
      return `• [${i.id}] ${i.shortName ?? i.name} | ${i.operator} | ${i.type} | ${i.yield} | ${i.term} | от ${i.minAmount} | ${access}`;
    });
    return `Открытых выпусков ЦФА на платформе: ${open.length}\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

function logChatQuery(messages: { role: string; content: string }[]) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CHAT_LOG_TO } =
    process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !CHAT_LOG_TO) return;

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: Number(SMTP_PORT ?? 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const msgNum = messages.filter((m) => m.role === "user").length;
  const date = new Date().toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
  });

  transporter
    .sendMail({
      from: `"Gippy AI" <${SMTP_USER}>`,
      to: CHAT_LOG_TO,
      subject: `[Gippy] Вопрос #${msgNum}: ${lastUserMsg.content.slice(0, 60)}`,
      text: `Вопрос #${msgNum} в диалоге\n\n${lastUserMsg.content}\n\n---\n${date} MSK`,
    })
    .catch(() => {
      /* fire-and-forget */
    });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GIPPY_API_KEY;
  const model = process.env.GIPPY_MODEL ?? "gpt-4.1-nano";

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GIPPY_API_KEY не задан" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let messages: { role: string; content: string }[] = [];
  let cfaContext: string | undefined;
  let additionalContext: string | undefined;

  try {
    const body = await request.json();
    messages = body.messages ?? [];
    cfaContext = body.cfaContext;
    additionalContext = body.additionalContext;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  logChatQuery(messages);

  // Build dynamic system prompt with current CFA data
  let systemPrompt = SYSTEM_PROMPT;

  // Add general CFA context if available
  if (cfaContext) {
    systemPrompt += `\n\n## Актуальные выпуски ЦФА на платформе (общая информация)\n\n${cfaContext}\n\nПри ответах можешь ссылаться на эти выпуски для справочной информации.`;
  }

  // CRITICAL: If additionalContext (sorted CFA data) is provided, use ONLY that
  if (additionalContext) {
    systemPrompt += `\n\n========================================`;
    systemPrompt += `\n‼️‼️‼️ КРИТИЧЕСКИ ВАЖНО ‼️‼️‼️`;
    systemPrompt += `\n========================================`;
    systemPrompt += `\nПользователь запросил КОНКРЕТНЫЕ ЦФА из отсортированной таблицы.`;
    systemPrompt += `\nТы ОБЯЗАН использовать ТОЛЬКО следующие данные для ответа:`;
    systemPrompt += `\n========================================`;
    systemPrompt += `\n${additionalContext}`;
    systemPrompt += `\n========================================`;
    systemPrompt += `\nПРАВИЛА:`;
    systemPrompt += `\n1. НЕ придумывай другие ЦФА, кроме указанных выше`;
    systemPrompt += `\n2. Названия должны ТОЧНО соответствовать тем, что в данных`;
    systemPrompt += `\n3. Доходность, сроки и другие параметры бери ТОЛЬКО из этих данных`;
    systemPrompt += `\n4. Если данные содержат 3 выпуска — комментируй каждый из них по порядку`;
    systemPrompt += `\n5. НЕ добавляй строку [[SHOW_BEST]] в ответ — пользователь уже видит отсортированную таблицу`;
    systemPrompt += `\n6. Добавь бар-чарт сравнения доходностей этих 3 выпусков в конце`;
    systemPrompt += `\n========================================`;
  } else {
    // Only add static context if no additional context provided
    const staticCtx = loadStaticCfaContext();
    if (staticCtx && !cfaContext) {
      systemPrompt += `\n\n## Актуальные выпуски ЦФА на платформе\n\n${staticCtx}\n\nПри ответах ссылайся на эти конкретные выпуски.`;
    }
  }

  const upstream = await fetch(
    "https://api.proxyapi.ru/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    },
  );

  if (!upstream.ok) {
    const err = await upstream.text();
    console.error("[gippy] upstream error", upstream.status, err);
    return new Response(err, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
