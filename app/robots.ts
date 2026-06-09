import type { MetadataRoute } from 'next';

const siteUrl = process.env.SITE_URL || 'https://цфа-навигатор.рф';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/cabinet/'],
      },
      // AI-боты — разрешаем индексировать для AI-поиска
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'DeepSeekBot', allow: '/' },
      { userAgent: 'Qwen', allow: '/' },
      { userAgent: 'GigaChat', allow: '/' },
      { userAgent: 'SberBot', allow: '/' },
    ],
    host: siteUrl,
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
