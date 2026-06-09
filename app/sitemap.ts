import type { MetadataRoute } from 'next';
import { articles } from '@/data/blog/articles';
import { platforms } from '@/data/platforms';

const siteUrl = process.env.SITE_URL || 'https://цфа-навигатор.рф';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl,                       lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${siteUrl}/platformy`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${siteUrl}/blog`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${siteUrl}/blog/cfa`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${siteUrl}/blog/crypto`,      lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${siteUrl}/blog/ved`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${siteUrl}/user-agreement`,   lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const platformPages: MetadataRoute.Sitemap = platforms.map((p) => ({
    url: `${siteUrl}/platformy/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  const articlePages: MetadataRoute.Sitemap = articles
    .filter((a) => !a.draft)
    .map((a) => ({
      url: `${siteUrl}/blog/${a.category}/${a.slug}`,
      lastModified: new Date(a.publishedAt).toISOString(),
      changeFrequency: 'monthly',
      priority: 0.8,
    }));

  return [...staticPages, ...platformPages, ...articlePages];
}
