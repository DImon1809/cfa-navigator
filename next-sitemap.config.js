/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://cfa-navigator.ru',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  changefreq: 'weekly',
  priority: 1.0,
  sitemapSize: 5000,

  // robots.txt options
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
      },
      {
        userAgent: 'DeepSeekBot',
        allow: '/',
      },
      {
        userAgent: 'Qwen',
        allow: '/',
      },
      {
        userAgent: 'GigaChat',
        allow: '/',
      },
      {
        userAgent: 'SberBot',
        allow: '/',
      },
    ],
    additionalSitemaps: [],
  },

  // Exclude paths
  exclude: ['/api/*', '/_next/*'],

  // Transform function to customize sitemap entries
  transform: async (config, path) => {
    let priority = 0.7;
    if (path === '/') priority = 1.0;
    else if (path === '/blog') priority = 0.9;
    else if (/^\/blog\/(cfa|crypto|ved)$/.test(path)) priority = 0.85;
    else if (path.startsWith('/blog/')) priority = 0.8;
    else if (path === '/platformy') priority = 0.9;
    else if (path.startsWith('/platformy/')) priority = 0.85;

    return {
      loc: path,
      changefreq: path.startsWith('/blog/') ? 'monthly' : config.changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
};
