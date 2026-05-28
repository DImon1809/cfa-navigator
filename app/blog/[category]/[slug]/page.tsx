import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { categoryMeta, articles, getArticle } from '@/data/blog/articles';
import type { Category } from '@/data/blog/articles';
import { getArticleContent } from '@/data/blog/content/index';
import { Footer } from '@/components/sections/Footer';
import { QuickLeadForm } from '@/components/sections/QuickLeadForm';
import { ArticleContent } from '@/components/blog/ArticleContent';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { Clock, ChevronLeft } from 'lucide-react';
import type { ArticleSection } from '@/data/blog/types';

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

const validCategories: Category[] = ['cfa', 'crypto', 'ved'];

const siteUrl = 'https://cfa-navigator.ru';

export async function generateStaticParams() {
  return articles.map((a) => ({ category: a.category, slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  if (!validCategories.includes(category as Category)) return {};

  const article = getArticle(category as Category, slug);
  if (!article) return {};

  const title = article.seoTitle ?? article.title;
  const description = article.seoDescription ?? article.description;

  return {
    title: `${title} | ЦФА.Навигатор`,
    description,
    keywords: article.keywords,
    alternates: {
      canonical: `${siteUrl}/blog/${category}/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.publishedAt,
      siteName: 'ЦФА.Навигатор',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

function extractFaqPairs(sections: ArticleSection[]): { question: string; answer: string }[] {
  const faqIdx = sections.findIndex(
    (s): s is Extract<ArticleSection, { type: 'h2' }> => s.type === 'h2' && (s as Extract<ArticleSection, { type: 'h2' }>).id === 'faq'
  );
  if (faqIdx === -1) return [];

  const pairs: { question: string; answer: string }[] = [];
  let i = faqIdx + 1;

  while (i < sections.length) {
    const s = sections[i];
    if (s.type === 'h2') break;
    if (s.type === 'h3' && i + 1 < sections.length && sections[i + 1].type === 'paragraph') {
      const rawHtml = (sections[i + 1] as Extract<ArticleSection, { type: 'paragraph' }>).html;
      const answer = rawHtml.replace(/<[^>]+>/g, '');
      pairs.push({ question: s.text, answer });
      i += 2;
    } else {
      i++;
    }
  }

  return pairs;
}

const categoryColors: Record<Category, { text: string; badge: string }> = {
  cfa: { text: 'text-primary', badge: 'bg-primary/10 text-primary' },
  crypto: { text: 'text-secondary', badge: 'bg-secondary/10 text-secondary' },
  ved: { text: 'text-success', badge: 'bg-success/10 text-success' },
};

export default async function ArticlePage({ params }: Props) {
  const { category, slug } = await params;

  if (!validCategories.includes(category as Category)) {
    notFound();
  }

  const cat = category as Category;
  const article = getArticle(cat, slug);

  if (!article) {
    notFound();
  }

  const catMeta = categoryMeta[cat];
  const colors = categoryColors[cat];

  const sections = await getArticleContent(slug);

  const tocItems = sections
    ? (sections.filter((s): s is Extract<ArticleSection, { type: 'h2' }> => s.type === 'h2').map((s) => ({
        id: s.id,
        text: s.text,
      })))
    : [];

  const related = articles
    .filter((a) => a.category === cat && a.slug !== slug)
    .slice(0, 3);

  const faqItems = sections ? extractFaqPairs(sections) : [];

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.description,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    inLanguage: 'ru',
    author: {
      '@type': 'Organization',
      name: 'ЦФА.Навигатор',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ЦФА.Навигатор',
      url: siteUrl,
    },
    url: `${siteUrl}/blog/${category}/${slug}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}/blog/${category}/${slug}` },
    keywords: article.keywords.join(', '),
  };

  const faqJsonLd = faqItems.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }
    : null;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Блог', item: `${siteUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: catMeta.label, item: `${siteUrl}/blog/${cat}` },
      { '@type': 'ListItem', position: 4, name: article.title, item: `${siteUrl}/blog/${category}/${slug}` },
    ],
  };

  return (
    <>
      <Script
        id="article-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Script
        id="breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <Script
          id="faq-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <main className="min-h-screen">
        {/* Breadcrumb */}
        <div className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Главная</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-foreground transition-colors">Блог</Link>
              <span>/</span>
              <Link href={`/blog/${cat}`} className={`hover:text-foreground transition-colors ${colors.text}`}>
                {catMeta.label}
              </Link>
              <span>/</span>
              <span className="truncate max-w-[200px] text-foreground">{article.title}</span>
            </div>
          </div>
        </div>

        {/* Article */}
        <article className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header — full width */}
            <div className="mx-auto max-w-5xl mb-8">
              <Link
                href={`/blog/${cat}`}
                className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                {catMeta.label}
              </Link>

              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${colors.badge}`}>
                  {catMeta.label}
                </span>
                {article.draft && (
                  <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    Скоро
                  </span>
                )}
              </div>

              <h1 className="mb-4 text-2xl font-bold text-foreground leading-tight md:text-3xl lg:text-4xl">
                {article.title}
              </h1>

              <div className="flex items-center gap-4 text-sm text-muted-foreground border-b border-border pb-6">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{article.readTime}</span>
                </div>
                {!article.draft && (
                  <>
                    <span>·</span>
                    <span>
                      {new Date(article.publishedAt).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Two-column layout: content + ToC */}
            <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[1fr_260px] lg:gap-12">
              {/* Main content */}
              <div className="min-w-0">
                {sections ? (
                  <ArticleContent sections={sections} />
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 p-10 text-center">
                    <p className="text-lg font-semibold text-foreground mb-2">Статья в разработке</p>
                    <p className="text-muted-foreground text-sm">
                      Материал скоро будет опубликован. Подпишитесь на Telegram-канал, чтобы получить его первым.
                    </p>
                    <a
                      href="https://t.me/cfa_navigation_rf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                    >
                      Подписаться на @cfa_navigation_rf
                    </a>
                  </div>
                )}
              </div>

              {/* Sticky ToC — hidden on mobile */}
              {tocItems.length > 0 && (
                <aside className="hidden lg:block">
                  <TableOfContents items={tocItems} />
                </aside>
              )}
            </div>
          </div>
        </article>

        {/* Related articles */}
        {related.length > 0 && (
          <section className="border-t border-border py-10 md:py-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-5xl">
                <h2 className="mb-6 text-xl font-bold text-foreground">Читайте также</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((rel) => (
                    <Link
                      key={rel.slug}
                      href={`/blog/${rel.category}/${rel.slug}`}
                      className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
                    >
                      <h3 className="font-medium text-foreground hover:text-primary transition-colors mb-1 text-sm">
                        {rel.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{rel.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Lead form */}
        <QuickLeadForm />
      </main>
      <Footer />
    </>
  );
}
