import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { platforms, getPlatform } from '@/data/platforms';
import { Footer } from '@/components/sections/Footer';

type Props = {
  params: Promise<{ slug: string }>;
};

const siteUrl = 'https://cfa-navigator.ru';

export function generateStaticParams() {
  return platforms.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const platform = getPlatform(slug);
  if (!platform) return {};

  return {
    title: platform.seoTitle,
    description: platform.seoDescription,
    keywords: [
      `${platform.name} ЦФА`,
      `${platform.name} цифровые финансовые активы`,
      `${platform.name} купить ЦФА`,
      `оператор ЦФА ${platform.owner}`,
      'платформа ЦФА Россия',
      'легальные ЦФА',
    ],
    alternates: {
      canonical: `${siteUrl}/platformy/${slug}`,
    },
    openGraph: {
      title: platform.seoTitle,
      description: platform.seoDescription,
      type: 'article',
      url: `${siteUrl}/platformy/${slug}`,
    },
    twitter: {
      card: 'summary',
      title: platform.seoTitle,
      description: platform.seoDescription,
    },
  };
}

function NonQualLabel({ value }: { value: boolean | 'partial' }) {
  if (value === true) return <span className="text-green-600 font-semibold">Да</span>;
  if (value === 'partial') return <span className="text-yellow-600 font-semibold">Частично</span>;
  return <span className="text-muted-foreground font-semibold">Нет</span>;
}

function SecondaryMarketLabel({ value }: { value: boolean | 'partial' }) {
  if (value === true) return <span className="text-green-600 font-semibold">Есть</span>;
  if (value === 'partial') return <span className="text-yellow-600 font-semibold">Пилот</span>;
  return <span className="text-muted-foreground font-semibold">Нет</span>;
}

export default async function PlatformPage({ params }: Props) {
  const { slug } = await params;
  const platform = getPlatform(slug);

  if (!platform) {
    notFound();
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Кому принадлежит платформа ${platform.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${platform.name} (${platform.fullName}) принадлежит ${platform.owner}. Платформа включена в реестр операторов ЦБ РФ в ${platform.registeredAt}.`,
        },
      },
      {
        '@type': 'Question',
        name: `Какая минимальная сумма для покупки ЦФА на ${platform.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Минимальная сумма инвестиции на платформе ${platform.name} составляет ${platform.minAmount}. ${platform.forNonQual === true ? 'Платформа доступна неквалифицированным инвесторам в рамках лимита 600 000 ₽ в год.' : platform.forNonQual === 'partial' ? 'Часть выпусков доступна неквалифицированным инвесторам в рамках лимита 600 000 ₽ в год.' : 'Платформа предназначена преимущественно для квалифицированных инвесторов.'}`,
        },
      },
      {
        '@type': 'Question',
        name: `Какие типы ЦФА доступны на ${platform.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `На платформе ${platform.name} доступны следующие типы ЦФА: ${platform.cfaTypes.join(', ')}. ${platform.hasSecondaryMarket === true ? 'Платформа имеет вторичный рынок, что позволяет продать ЦФА досрочно.' : platform.hasSecondaryMarket === 'partial' ? 'Вторичный рынок работает в режиме пилота для части инструментов.' : 'Вторичный рынок отсутствует — вложения фиксируются до даты погашения.'}`,
        },
      },
    ],
  };

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: platform.fullName,
    url: platform.website,
    description: platform.tagline,
    parentOrganization: {
      '@type': 'Organization',
      name: platform.owner,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Платформы', item: `${siteUrl}/platformy` },
      { '@type': 'ListItem', position: 3, name: platform.name, item: `${siteUrl}/platformy/${slug}` },
    ],
  };

  return (
    <>
      <Script
        id="faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Script
        id="org-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <Script
        id="breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="min-h-screen">
        {/* Breadcrumb */}
        <div className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Главная</Link>
              <span>/</span>
              <Link href="/platformy" className="hover:text-foreground transition-colors">Платформы</Link>
              <span>/</span>
              <span className="text-foreground">{platform.name}</span>
            </div>
          </div>
        </div>

        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <div className="mb-5 flex items-start gap-4">
                <div
                  className={`flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold ${platform.colorClass}`}
                  style={{ height: '72px', width: '72px' }}
                >
                  {platform.initial}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-foreground md:text-3xl">{platform.name}: ЦФА-платформа</h1>
                    {platform.badge && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        {platform.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground">{platform.tagline}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  Владелец: <span className="text-foreground font-medium">{platform.owner}</span>
                </span>
                <span>
                  В реестре ЦБ с: <span className="text-foreground font-medium">{platform.registeredAt}</span>
                </span>
                <span>
                  Полное название: <span className="text-foreground font-medium">{platform.fullName}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-border py-6">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Мин. сумма</p>
                  <p className="font-bold text-foreground text-lg">{platform.minAmount}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Типов ЦФА</p>
                  <p className="font-bold text-foreground text-lg">{platform.cfaTypes.length}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Неквал</p>
                  <p className="text-lg"><NonQualLabel value={platform.forNonQual} /></p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Вторичный рынок</p>
                  <p className="text-lg"><SecondaryMarketLabel value={platform.hasSecondaryMarket} /></p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <article className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl space-y-10">

              {/* About */}
              <section>
                <h2 className="mb-4 text-xl font-bold text-foreground">О платформе</h2>
                <div className="space-y-4">
                  {platform.about.map((para, i) => (
                    <p key={i} className="text-muted-foreground leading-relaxed">{para}</p>
                  ))}
                </div>
              </section>

              {/* How it works */}
              <section>
                <h2 className="mb-4 text-xl font-bold text-foreground">Как работает платформа</h2>
                <div className="space-y-4">
                  {platform.howItWorks.map((para, i) => (
                    <p key={i} className="text-muted-foreground leading-relaxed">{para}</p>
                  ))}
                </div>

                {/* CFA types */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {platform.cfaTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-foreground"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </section>

              {/* Pros / Cons */}
              <section>
                <h2 className="mb-4 text-xl font-bold text-foreground">Плюсы и минусы</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-5">
                    <p className="mb-3 text-sm font-semibold text-green-700 dark:text-green-400">Плюсы</p>
                    <ul className="space-y-2">
                      {platform.pros.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-green-900 dark:text-green-100">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-5">
                    <p className="mb-3 text-sm font-semibold text-red-700 dark:text-red-400">Минусы</p>
                    <ul className="space-y-2">
                      {platform.cons.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-red-900 dark:text-red-100">
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* How to buy */}
              <section>
                <h2 className="mb-4 text-xl font-bold text-foreground">Как купить ЦФА</h2>
                <ol className="space-y-3">
                  {platform.howToBuy.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Disclaimer */}
              <section className="rounded-2xl border border-border bg-muted/40 p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg leading-none select-none" aria-hidden="true">ℹ️</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1.5">Это не реклама и не инвестиционная рекомендация</p>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li>ЦФА — не банковский вклад, не застрахованы АСВ</li>
                      <li>Для неквалов лимит <span className="font-medium text-foreground">600 000 ₽/год</span> суммарно на все платформы</li>
                      <li>Доходность с привязкой к рыночным активам не гарантирована</li>
                      <li>Перед покупкой читайте условия конкретного выпуска</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* CTA */}
              <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
                <h2 className="mb-2 text-lg font-bold text-foreground">
                  Подобрать лучшие ЦФА с этой платформы
                </h2>
                <p className="mb-5 text-sm text-muted-foreground">
                  Оставьте заявку — мы пришлём актуальные выпуски {platform.name} под вашу сумму и срок
                </p>
                <Link
                  href="/#form"
                  className="inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                >
                  Получить подборку бесплатно
                </Link>
              </section>

            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
