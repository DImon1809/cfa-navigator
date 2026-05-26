import type { Metadata } from 'next';
import Link from 'next/link';
import { categoryMeta, articles } from '@/data/blog/articles';
import type { Category } from '@/data/blog/articles';
import { Footer } from '@/components/sections/Footer';

const siteUrl = process.env.SITE_URL || 'https://cfa-navigator.ru';

export const metadata: Metadata = {
  title: 'Блог о ЦФА, легальной крипте и ВЭД — ЦФА.Навигатор',
  description:
    'Статьи о цифровых финансовых активах, легальной крипте в России и международных расчётах. Где купить ЦФА, налоги с крипты, оплата поставок из Китая.',
  alternates: {
    canonical: `${siteUrl}/blog`,
  },
  openGraph: {
    title: 'Блог ЦФА.Навигатор — ЦФА, Крипто, ВЭД',
    description: 'Всё о легальных инвестициях в цифровые активы: ЦФА, крипта, международные расчёты',
    url: `${siteUrl}/blog`,
  },
};

const categoryOrder: Category[] = ['cfa', 'crypto', 'ved'];

const categoryColors: Record<Category, { bg: string; text: string; border: string; pill: string }> = {
  cfa: {
    bg: 'bg-primary/5',
    text: 'text-primary',
    border: 'border-primary/20',
    pill: 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20',
  },
  crypto: {
    bg: 'bg-secondary/5',
    text: 'text-secondary',
    border: 'border-secondary/20',
    pill: 'bg-secondary/10 text-secondary border-secondary/30 hover:bg-secondary/20',
  },
  ved: {
    bg: 'bg-success/5',
    text: 'text-success',
    border: 'border-success/20',
    pill: 'bg-success/10 text-success border-success/30 hover:bg-success/20',
  },
};

export default function BlogPage() {
  const recentArticles = articles.slice(0, 6);

  return (
    <>
      <main className="min-h-screen">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
                Блог о ЦФА, крипте и ВЭД
              </h1>
              <p className="text-lg text-muted-foreground">
                Разбираем сложное простым языком: где купить ЦФА, как легально работать с криптой
                и как проводить международные расчёты
              </p>
            </div>
          </div>
        </section>

        {/* Три категории-пилюли */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-8 text-center text-xl font-semibold text-foreground">
                Выберите тему
              </h2>

              <div className="grid gap-4 sm:grid-cols-3">
                {categoryOrder.map((cat) => {
                  const meta = categoryMeta[cat];
                  const colors = categoryColors[cat];
                  const count = articles.filter((a) => a.category === cat).length;

                  return (
                    <Link
                      key={cat}
                      href={`/blog/${cat}`}
                      className={`group flex flex-col items-center rounded-full border-2 px-8 py-8 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${colors.pill} border-current`}
                    >
                      <span className="mb-1 text-2xl font-bold">{meta.label}</span>
                      <span className="text-xs opacity-70">{count} статей</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Описания категорий */}
        <section className="border-t border-border pb-12 md:pb-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-4 md:grid-cols-3">
                {categoryOrder.map((cat) => {
                  const meta = categoryMeta[cat];
                  const colors = categoryColors[cat];
                  const catArticles = articles.filter((a) => a.category === cat);

                  return (
                    <div
                      key={cat}
                      className={`rounded-2xl border p-6 ${colors.bg} ${colors.border}`}
                    >
                      <Link href={`/blog/${cat}`}>
                        <h3 className={`mb-2 text-lg font-bold ${colors.text}`}>{meta.label}</h3>
                      </Link>
                      <p className="mb-4 text-sm text-muted-foreground">{meta.description}</p>
                      <ul className="space-y-2">
                        {catArticles.slice(0, 3).map((article) => (
                          <li key={article.slug}>
                            <Link
                              href={`/blog/${cat}/${article.slug}`}
                              className="text-sm text-foreground hover:text-primary transition-colors line-clamp-2"
                            >
                              {article.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {catArticles.length > 3 && (
                        <Link
                          href={`/blog/${cat}`}
                          className={`mt-4 block text-sm font-medium ${colors.text} hover:underline`}
                        >
                          Все статьи →
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
