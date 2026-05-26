# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ЦФА.Навигатор** — smoke test landing page для валидации спроса на агрегатор цифровых финансовых активов (ЦФА) в России. Концепция аналогична banki.ru/sravni.ru, но для легального крипто-рынка.

**Цель проекта:** За 2 недели и $0 бюджета проверить гипотезу о платежеспособном спросе на сервис сравнения ЦФА-платформ.

**Success criteria:** Конверсия заявок >10% из посетителей (>50 заявок за 2 недели).

## AI Agents

Четыре специализированных агента должны **обязательно** вызываться при работе с контентом, UX и финансовыми смыслами лендинга:

### cfa-conversion-psychologist
**Вызывать при:**
- Написании или редактировании любого copy (Hero, PainCards, CfaCards, LeadForm, SeoContent)
- Изменении структуры, порядка блоков или расположения элементов на странице
- Добавлении/изменении CTA-кнопок, форм, trust-сигналов
- Любых UX-изменениях, влияющих на конверсию
- Анализе проблем с конверсией

**Цель:** Психологическая оптимизация для максимальной конверсии (целевой показатель >10%).

### cfa-seo-copywriter
**Вызывать при:**
- Написании или обновлении SEO-текстов (SeoContent, FAQ)
- Изменении мета-тегов, H1, структуры заголовков
- Создании нового контента для страниц/блоков
- Вопросах о ранжировании в Google/Яндекс
- AI-SEO задачах (чтобы ChatGPT/Perplexity рекомендовали сайт)

**Цель:** Органический трафик через SEO и AI-поиск.

### russian-finance-expert
**Вызывать при:**
- Проверке финансовой и юридической корректности любого контента (описания ЦФА, дисклеймеры, лимиты)
- Добавлении или обновлении данных в `cfa.json` — верификация параметров продуктов (доходность, сроки, лимиты)
- Написании FAQ, текстов о рисках, налогах, регуляторике
- Вопросах о ФЗ-259, требованиях ЦБ РФ, квалификации инвесторов
- Консультации других агентов по финансовой точности их контента

**Цель:** Гарантировать фактическую и юридическую точность всего контента платформы. Агент консультирует как пользователя, так и других агентов — вызывать **до финализации** любого финансового контента.

### cfa-edu-copywriter
**Вызывать при:**
- Создании обучающих статей, объяснялок, сравнений для блога или новых страниц сайта
- Написании длинных текстов (>700 слов) о ЦФА, легальной крипте, налогах, платформах
- Создании нарративных историй или кейсов для привлечения аудитории
- Разработке FAQ-блоков с детальными ответами

**Цель:** Профессиональный образовательный контент, который обучает аудиторию и конвертирует в заявки.

**Связка агентов для контентных задач:**
1. `russian-finance-expert` — сначала проверяет факты и формулирует корректные смыслы
2. `cfa-edu-copywriter` — пишет текст на основе проверенных данных
3. `cfa-seo-copywriter` — оптимизирует под SEO
4. `cfa-conversion-psychologist` — финальная проверка на конверсионность

> Все агенты вызываются **проактивно** — не ждать явного запроса пользователя. Если задача касается контента, копирайтинга, финансовых данных или расположения блоков — запускать нужных агентов до написания кода.

## Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS (адаптивная верстка, никаких UI-библиотек)
- **Deploy:** Docker + docker-compose (own server)
- **Forms:** Make.com webhooks → Telegram Bot + Google Sheets
- **Analytics:** Яндекс.Метрика + Google Search Console

### Critical Constraints

- **Zero backend** — всё статично или через webhooks
- **Maximum performance** — цель LCP < 2.5s, minimal bundle size
- **SEO-first** — organic search is primary traffic source
- **Mobile-first** — >60% traffic from mobile expected

## Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main landing page (single page, all sections)
│   │   ├── layout.tsx        # Meta tags, fonts, structured data
│   │   └── globals.css       # Base Tailwind config + custom styles
│   ├── components/
│   │   ├── Hero.tsx          # Section 1: Main headline + CTA
│   │   ├── PainCards.tsx     # Section 2: 3 pain points (problem awareness)
│   │   ├── CfaCards.tsx      # Section 3: CFA offer cards (grid)
│   │   ├── LeadForm.tsx      # Section 4: Lead capture form (core conversion)
│   │   ├── SeoContent.tsx    # Section 5: SEO text block + FAQ
│   │   └── Footer.tsx        # Section 6: Footer + disclaimers
│   └── data/
│       └── cfa.json          # Static CFA offers (update manually weekly)
├── Dockerfile                # Multi-stage production build
├── docker-compose.yml        # Container orchestration
├── .dockerignore             # Exclude files from Docker build
├── .env                      # Environment variables (NOT in git)
├── .env.example              # Example env file for documentation
├── next.config.js            # Next.js config with output: 'standalone'
└── package.json
```

## Development Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev           # http://localhost:3000

# Build for production
npm run build

# Preview production build locally
npm run start

# Type checking
npm run type-check    # or: npx tsc --noEmit

# Lint
npm run lint
```

## Architecture & Key Components

### Single-Page Structure

This is a **one-page landing** with smooth scroll navigation. No routing, no page transitions. All sections live in `app/page.tsx` and are composed from components.

**Section flow:**
1. Hero → CTA button scrolls to form (#form anchor)
2. Pain Cards → build problem awareness
3. CFA Cards → show solutions (3-4 real offers)
4. Lead Form → **core conversion element**
5. SEO Content → text for search engines
6. Footer → legal disclaimers

### CFA Data Management

CFA cards are **statically managed** in `src/data/cfa.json`. No live parsing on MVP.

**Data structure:**
```json
{
  "id": "tbank-btc-3",
  "name": "ЦФА Т-Банк / Биткоин №3",
  "operator": "Т-Банк (Atomyze)",
  "type": "Привязан к курсу BTC",
  "yield": "До +34% (зависит от курса)",
  "term": "6 мес.",
  "minAmount": "1 000 ₽",
  "access": ["Неквал", "Квал"],
  "status": "open|closed|soon",
  "badge": "Распродан за 1 день"
}
```

**Update process:**
1. Edit `src/data/cfa.json` manually
2. Git commit + push
3. Rebuild and restart Docker container on server

**Data sources for manual updates:**
- tokeon.ru → раздел "Выпуски"
- atomyze.tech → карточки выпусков
- tbank.ru/invest → ЦФА секция

### Lead Form Flow

**Critical UX requirements:**

1. **Max 5 fields** (не больше!):
   - Имя (optional)
   - Email/Telegram (required + validation)
   - Сумма инвестиций (select: до 50к / 50-150к / 150-300к / 300к-1млн / >1млн)
   - Цель (select: сохранить от инфляции / доход / спекуляция / диверсификация)
   - Срок (radio/select: до 3 мес / 3-6 / 6-12 / >года)

2. **After submit:**
   - Disable button (prevent double submit)
   - Replace form with success message: "✅ Отлично! Пришлём подборку в течение часа"
   - Show Telegram channel link below
   - **NO modal windows** (annoying on mobile)
   - **NO redirect** (user stays on page)

3. **Integration schema:**
```
Form submit → fetch(MAKE_WEBHOOK_URL) → Make.com scenario
                                            ├─→ Telegram Bot (instant notification)
                                            └─→ Google Sheets (data storage)
```

**Make.com webhook payload:**
```typescript
{
  name: string;
  contact: string;        // email or @telegram
  amount: string;
  goal: string;
  term: string;
  comment?: string;
  timestamp: string;      // ISO 8601
  source: string;         // document.referrer or 'direct'
}
```

## SEO Requirements

### Meta Tags (in app/layout.tsx)

**Required tags:**
```tsx
<title>Сравнить ЦФА и легально купить крипту в России — ЦФА.Навигатор</title>
<meta name="description" content="Сравниваем ЦФА от Сбера, Т-Банка, Атомайза и других операторов. Подбираем легальную биржу без риска блокировки счёта. Бесплатно." />
<meta property="og:title" content="ЦФА.Навигатор — сравни все предложения" />
<meta property="og:description" content="Легальные ЦФА и крипта в РФ" />
<meta property="og:type" content="website" />
<link rel="canonical" href="https://[domain]" />
```

### Key SEO Elements

- **H1:** Exactly one, contains "ЦФА" + "легальные платформы"
- **Alt attributes:** All images must have descriptive alt text
- **robots.txt:** Allow all, include sitemap
- **sitemap.xml:** Use `next-sitemap` package
- **Structured data:** Add JSON-LD for FAQPage schema

### SEO Keywords (organic integration)

Include naturally in SeoContent component:
- цифровые финансовые активы
- купить ЦФА физическому лицу
- легальная крипта Россия 2026
- ЦФА неквалифицированный инвестор лимит
- Atomyze Т-Банк ЦФА сравнение
- налог с ЦФА 3-НДФЛ

### Performance Targets

- **LCP:** < 2.5s
- **FID:** < 100ms
- **CLS:** < 0.1

**How to achieve:**
- Use only Tailwind (no heavy animation libs)
- Optimize images (next/image with proper sizing)
- Minimal JavaScript bundle
- No external dependencies beyond essentials

## Deployment (Docker)

### Docker Setup

Project uses Docker for production deployment on own server. Build optimized for minimal size and maximum performance.

**Required files:**
- `Dockerfile` — multi-stage build for Next.js production
- `docker-compose.yml` — orchestration with nginx (if needed)
- `.dockerignore` — exclude node_modules, .git, etc.
- `.env` — environment variables (NOT committed to git)

### Dockerfile Structure

```dockerfile
# Multi-stage build
FROM node:20-alpine AS base

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build stage
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  cfa-navigator:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: cfa-navigator
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_MAKE_WEBHOOK_URL=${NEXT_PUBLIC_MAKE_WEBHOOK_URL}
    env_file:
      - .env
    networks:
      - cfa-network

networks:
  cfa-network:
    driver: bridge
```

### Environment Variables

Create `.env` file in project root (do NOT commit):

```bash
NEXT_PUBLIC_MAKE_WEBHOOK_URL=https://hook.eu1.make.com/[your-webhook-id]
```

### Deployment Commands

```bash
# Build and start containers
docker-compose up -d --build

# View logs
docker-compose logs -f cfa-navigator

# Restart after code changes
docker-compose restart cfa-navigator

# Stop containers
docker-compose down

# Rebuild from scratch (clean build)
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Update Process (Production)

```bash
# On server
git pull origin main
docker-compose down
docker-compose up -d --build

# Or use single command
docker-compose up -d --build --force-recreate
```

### Next.js Configuration for Docker

Add to `next.config.js`:

```javascript
module.exports = {
  output: 'standalone', // Required for Docker deployment
  compress: true,
  poweredByHeader: false,
}
```

### Nginx Reverse Proxy (Optional)

If using nginx in front of Docker:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### Health Check

Add to docker-compose.yml:

```yaml
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## A/B Testing Strategy

Test 3 hero variants with different pain points:

**Variant A (focus: CFA investing)**
- URL: `/?utm_content=cfa`
- H1: "Найди лучший ЦФА под твою задачу"
- Target: investors

**Variant B (focus: legal crypto)**
- URL: `/?utm_content=crypto`
- H1: "Купи биткоин легально без блокировки счёта"
- Target: crypto users

**Variant C (focus: taxes)**
- URL: `/?utm_content=tax`
- H1: "Посчитай налог с крипты и не получи штраф"
- Target: tax compliance audience

Track conversion by UTM in Google Sheets (from form payload).

## Success Metrics

| Metric | Fail threshold | Success threshold |
|--------|---------------|------------------|
| Form conversion rate | < 3% | > 10% |
| Total leads (2 weeks) | < 20 | > 50 |
| Average investment amount | < 50k ₽ | > 100k ₽ |
| Top traffic source | Direct | Organic/Telegram |
| Return visitors | < 5% | > 15% |

## Analytics Setup

- **Яндекс.Метрика:** Goal on form submit, clickmap, session replay
- **Google Search Console:** Track organic queries after indexing
- **UTM tags:** All external links must have `?utm_source=X&utm_content=Y`

## Important Notes

- **No live parsing** on MVP — update `cfa.json` manually once a week
- **No backend** — all form processing through Make.com webhooks
- **No authentication** — fully public landing page
- **No database** — data lives in Google Sheets
- **Mobile-first** — test all components in Chrome DevTools responsive mode
- **Form is sacred** — optimize everything around maximizing form conversions

## Timeline Reference

- Day 1: Setup Next.js + Make.com + create cfa.json
- Day 2: Layout Hero + PainCards + CfaCards (Tailwind)
- Day 3: Build LeadForm + test webhook integration
- Day 4: Add SeoContent + FAQ + meta tags + sitemap
- Day 5: Setup Docker + deploy to server + add analytics
- Days 6-7: Launch traffic (VC.ru posts, Telegram)
- Days 8-14: Process leads manually, measure metrics, decide on full product
