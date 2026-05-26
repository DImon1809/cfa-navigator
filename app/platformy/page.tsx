import type { Metadata } from 'next';
import Link from 'next/link';
import { platforms } from '@/data/platforms';
import { Footer } from '@/components/sections/Footer';

export const metadata: Metadata = {
  title: 'Платформы ЦФА — операторы с лицензией ЦБ РФ | ЦФА.Навигатор',
  description:
    'Все операторы ЦФА в России: Т-Банк, СберЦФА, Атомайз, Токеон, Лайтхаус, А-Токен. Кому принадлежат, как работают, условия для инвесторов.',
  alternates: {
    canonical: 'https://cfa-navigator.ru/platformy',
  },
  openGraph: {
    title: 'Платформы ЦФА — операторы с лицензией ЦБ РФ',
    description: 'Все 6 операторов ЦФА в России: сравнение условий, минимальных сумм и доступности для неквалов.',
  },
};

function NonQualBadge({ value }: { value: boolean | 'partial' }) {
  if (value === true) return <span className="text-green-600 font-medium">✓ Да</span>;
  if (value === 'partial') return <span className="text-yellow-600 font-medium">◐ Частично</span>;
  return <span className="text-muted-foreground">✗ Нет</span>;
}

export default function PlatformyPage() {
  return (
    <>
      <main className="min-h-screen">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-wider text-primary">
                6 официальных операторов
              </p>
              <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
                Операторы ЦФА в России: все платформы с лицензией ЦБ
              </h1>
              <p className="text-lg text-muted-foreground">
                Сравниваем Т-Банк, СберЦФА, Атомайз, Токеон, Лайтхаус и А-Токен: условия, минимальные суммы и доступность для неквалифицированных инвесторов
              </p>
            </div>
          </div>
        </section>

        {/* Platform grid */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {platforms.map((platform) => (
                <Link
                  key={platform.slug}
                  href={`/platformy/${platform.slug}`}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                >
                  {/* Header */}
                  <div className="mb-4 flex items-start gap-3">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${platform.colorClass}`}
                    >
                      {platform.initial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{platform.name}</span>
                        {platform.badge && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {platform.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Владелец: {platform.owner}</p>
                    </div>
                  </div>

                  {/* Tagline */}
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{platform.tagline}</p>

                  {/* Divider */}
                  <div className="mt-auto border-t border-border pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        <p>
                          <span className="text-muted-foreground">Мин.: </span>
                          <span className="font-medium text-foreground">{platform.minAmount}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Неквал: </span>
                          <NonQualBadge value={platform.forNonQual} />
                        </p>
                      </div>
                      <span className="text-primary text-sm font-medium group-hover:underline">
                        Подробнее →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Info block */}
        <section className="border-t border-border py-10 md:py-12 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-3 text-xl font-bold text-foreground">Как выбрать платформу ЦФА?</h2>
              <p className="text-muted-foreground">
                Все 6 операторов включены в официальный реестр ЦБ РФ и работают по ФЗ-259. Выбор зависит от вашей суммы, срока и предпочитаемого базового актива.
                Не можете определиться — оставьте заявку, и мы подберём лучшие выпуски под ваши параметры.
              </p>
              <Link
                href="/#form"
                className="mt-5 inline-block rounded-full bg-primary px-7 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Получить подборку бесплатно
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
