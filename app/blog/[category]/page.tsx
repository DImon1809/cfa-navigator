import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { categoryMeta, articles } from '@/data/blog/articles';
import type { Category } from '@/data/blog/articles';
import { Footer } from '@/components/sections/Footer';
import { Clock } from 'lucide-react';

type Props = {
  params: Promise<{ category: string }>;
};

const validCategories: Category[] = ['cfa', 'crypto', 'ved'];
const siteUrl = process.env.SITE_URL || 'https://cfa-navigator.ru';

export async function generateStaticParams() {
  return validCategories.map((cat) => ({ category: cat }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  if (!validCategories.includes(category as Category)) return {};

  const cat = category as Category;
  const meta = categoryMeta[cat];
  const count = articles.filter((a) => a.category === cat).length;

  return {
    title: `${meta.label} — статьи и гайды | ЦФА.Навигатор`,
    description: `${meta.description}. ${count} статей с разборами, примерами и актуальными данными на 2026 год.`,
    alternates: {
      canonical: `${siteUrl}/blog/${cat}`,
    },
    openGraph: {
      title: `${meta.label} — статьи | ЦФА.Навигатор`,
      description: meta.description,
      url: `${siteUrl}/blog/${cat}`,
    },
  };
}

const categoryColors: Record<Category, { bg: string; text: string; badge: string }> = {
  cfa: { bg: 'bg-primary/5', text: 'text-primary', badge: 'bg-primary/10 text-primary' },
  crypto: { bg: 'bg-secondary/5', text: 'text-secondary', badge: 'bg-secondary/10 text-secondary' },
  ved: { bg: 'bg-success/5', text: 'text-success', badge: 'bg-success/10 text-success' },
};

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;

  if (!validCategories.includes(category as Category)) {
    notFound();
  }

  const cat = category as Category;
  const meta = categoryMeta[cat];
  const colors = categoryColors[cat];
  const catArticles = articles.filter((a) => a.category === cat);

  return (
    <>
      <main className="min-h-screen">
        {/* Breadcrumb */}
        <div className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Главная</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-foreground transition-colors">Блог</Link>
              <span>/</span>
              <span className={colors.text}>{meta.label}</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <section className={`border-b border-border py-10 md:py-14 ${colors.bg}`}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <span className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-medium ${colors.badge}`}>
                {meta.label}
              </span>
              <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
                {meta.description}
              </h1>
              <p className="text-muted-foreground">
                {catArticles.length} {catArticles.length === 1 ? 'статья' : 'статей'} — актуальные разборы на 2026 год
              </p>
            </div>
          </div>
        </section>

        {/* Article list */}
        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              {catArticles.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/30 p-12 text-center">
                  <p className="text-muted-foreground">Статьи скоро появятся. Подпишитесь на канал:</p>
                  <a
                    href="https://t.me/cfa_navigation_rf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-primary hover:underline"
                  >
                    @cfa_navigation_rf
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {catArticles.map((article) => (
                    <article key={article.slug} className="py-6 first:pt-0">
                      <Link href={`/blog/${cat}/${article.slug}`} className="group block">
                        <div className="flex items-center gap-2 mb-2">
                          <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                            {article.title}
                          </h2>
                          {article.draft && (
                            <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              Скоро
                            </span>
                          )}
                        </div>
                        <p className="mb-3 text-muted-foreground leading-relaxed">
                          {article.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{article.readTime}</span>
                          {!article.draft && (
                            <>
                              <span>·</span>
                              <span>{new Date(article.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </>
                          )}
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              )}

              {/* Navigation to other categories */}
              <div className="mt-12 rounded-2xl border border-border bg-muted/30 p-6">
                <p className="mb-4 font-medium text-foreground">Другие темы:</p>
                <div className="flex flex-wrap gap-3">
                  {validCategories
                    .filter((c) => c !== cat)
                    .map((c) => (
                      <Link
                        key={c}
                        href={`/blog/${c}`}
                        className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                      >
                        {categoryMeta[c].label}
                      </Link>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
