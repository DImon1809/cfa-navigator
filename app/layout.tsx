import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { GippyOrbProvider } from "@/context/gippy-orb-context";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.SITE_URL || "https://цфа-навигатор.рф";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Сравнить ЦФА и легально купить крипту в России — ЦФА.Навигатор",
  description:
    "ЦФА — цифровые облигации с доходностью выше вклада. Сравниваем платформы для неквалов и квалов. Легально, без риска блокировки счёта. Бесплатно.",
  keywords: [
    "цфа",
    "цифровые финансовые активы",
    "купить цфа",
    "купить цфа физическому лицу",
    "продать цфа",
    "продажа цфа вторичный рынок",
    "новости цфа",
    "цфа 2026",
    "цфа рынок новости",
    "выпуски цфа",
    "легальная крипта россия 2026",
    "цфа неквалифицированный инвестор",
    "atomyze т-банк цфа",
    "налог с цфа",
    "сравнение цфа",
    "цфа сбербанк",
    "цфа т-банк",
    "цфа атомайз",
    "цфа токеон",
    "цфа биткоин",
    "цфа золото",
  ],
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  authors: [{ name: "ЦФА.Навигатор" }],
  creator: "ЦФА.Навигатор",
  publisher: "ЦФА.Навигатор",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: siteUrl,
    title: "ЦФА.Навигатор — сравни все предложения",
    description: "Легальные ЦФА и крипта в РФ. Сравниваем все платформы.",
    siteName: "ЦФА.Навигатор",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1280,
        height: 960,
        alt: "ЦФА.Навигатор — сравни все предложения по цифровым финансовым активам",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ЦФА.Навигатор — сравни все предложения",
    description: "Легальные ЦФА и крипта в РФ",
  },
  verification: {
    // Добавить коды верификации после регистрации в вебмастерах
    // yandex: 'код_яндекс_вебмастер',
    // google: 'код_google_search_console',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ymCounterId = process.env.NEXT_PUBLIC_YM_COUNTER_ID;

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Яндекс.Метрика */}
        {ymCounterId && (
          <>
            <Script id="yandex-metrika" strategy="lazyOnload">
              {`
                (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
                (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

                ym(${ymCounterId}, "init", {
                  clickmap:true,
                  trackLinks:true,
                  accurateTrackBounce:true,
                  webvisor:true
                });
              `}
            </Script>
            <noscript>
              <div>
                <img
                  src={`https://mc.yandex.ru/watch/${ymCounterId}`}
                  style={{ position: "absolute", left: "-9999px" }}
                  alt=""
                />
              </div>
            </noscript>
          </>
        )}

        {/* Structured Data - WebSite */}
        <Script
          id="structured-data-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "ЦФА.Навигатор",
              url: siteUrl,
              inLanguage: "ru",
              description: "Агрегатор цифровых финансовых активов (ЦФА) в России. Сравниваем платформы, доходности и условия.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${siteUrl}/blog?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
              publisher: { "@type": "Organization", name: "ЦФА.Навигатор" },
            }),
          }}
        />

        {/* Structured Data - Organization */}
        <Script
          id="structured-data-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "ЦФА.Навигатор",
              url: siteUrl,
              logo: `${siteUrl}/icon.svg`,
              description: "Сервис сравнения цифровых финансовых активов (ЦФА) в России. Помогаем выбрать лучшую платформу: Сбербанк, Т-Банк, Атомайз, Токеон, Лайтхаус.",
              inLanguage: "ru",
              areaServed: "RU",
              knowsAbout: ["ЦФА", "цифровые финансовые активы", "криптовалюта Россия", "инвестиции"],
            }),
          }}
        />

        {/* Structured Data - FAQPage */}
        <Script
          id="structured-data-faq"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "Что такое ЦФА и чем отличаются от обычных криптовалют?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "ЦФА (цифровые финансовые активы) — это цифровые облигации, выпускаемые лицензированными российскими операторами (Сбербанк, Т-Банк, Атомайз) под надзором ЦБ РФ по закону 259-ФЗ. В отличие от криптовалюты, ЦФА полностью легальны в России, операторы являются налоговыми агентами и автоматически отчитываются в ФНС. Покупка ЦФА не грозит блокировкой счетов.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Как купить ЦФА физическому лицу без статуса квалинвестора?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Для покупки ЦФА достаточно банковского счёта в РФ. Нужно выбрать платформу оператора (Т-Банк, Сбер, Атомайз), пройти регистрацию и идентификацию, пополнить счёт и купить выпуск. Для неквалифицированных инвесторов действует лимит 600 000 ₽ в год суммарно на всех операторов, порог входа от 1 000 ₽.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Какова доходность ЦФА в 2026 году по сравнению с вкладом?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Фиксированные ЦФА в 2026 году предлагают доходность 22–28% годовых, тогда как банковские вклады дают около 16%. ЦФА с привязкой к курсу биткоина или золота могут давать до 34%, но несут рыночный риск изменения стоимости базового актива.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Безопасно ли покупать ЦФА — не заблокируют ли счёт?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "ЦФА абсолютно легальны в России и регулируются законом 259-ФЗ. Операторы — крупные банки с лицензией ЦБ РФ. Покупка ЦФА не даёт банку оснований для блокировки счёта, так как все транзакции проходят через легальных российских операторов.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Как платить налог с дохода от ЦФА — нужна ли 3-НДФЛ?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Нет, декларацию 3-НДФЛ подавать не нужно. Операторы ЦФА являются налоговыми агентами и автоматически удерживают 13% НДФЛ (15% с доходов свыше 5 млн ₽ в год). Это главное преимущество перед обычной криптовалютой, где налог нужно считать и платить самостоятельно.",
                  },
                },
                {
                  "@type": "Question",
                  name: "В чём разница между Атомайз, Т-Банк и Сбербанк в плане ЦФА?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Т-Банк предлагает ЦФА с привязкой к биткоину и эфиру с доходностью до 34%, порог от 1 000 ₽. Сбербанк фокусируется на фиксированных ЦФА (22–24%) и ЦФА на золото. Атомайз — независимая платформа с широким выбором и вторичным рынком для досрочной продажи. ЦФА.Навигатор сравнивает все три платформы в одном месте.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Можно ли продать ЦФА досрочно до окончания срока?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Да, часть операторов предоставляет вторичный рынок для продажи ЦФА другому инвестору до даты погашения. Атомайз имеет встроенную биржу для торговли токенами. Также некоторые выпуски содержат оферту — право досрочного погашения по фиксированной цене. Условия указаны в карточке конкретного выпуска ЦФА.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Где следить за новостями рынка ЦФА и новыми выпусками?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Новые выпуски ЦФА появляются еженедельно, некоторые закрываются за несколько часов. ЦФА.Навигатор обновляет подборку каждую неделю. Также новости ЦФА публикуют операторы: tokeon.ru, atomyze.tech, tbank.ru/invest. Подписчики Telegram-канала получают уведомления о выгодных новинках.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Можно ли легально купить биткоин в России в 2026 году?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Прямая покупка биткоина через P2P или зарубежные биржи находится в серой зоне и может привести к блокировке счёта. Легальная альтернатива — ЦФА с привязкой к курсу биткоина от Т-Банка или других операторов с лицензией ЦБ РФ. Вы получаете аналогичную доходность без правовых рисков.",
                  },
                },
              ],
            }),
          }}
        />

        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||t===null){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <GippyOrbProvider>
              <Header />
              {children}
            </GippyOrbProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
