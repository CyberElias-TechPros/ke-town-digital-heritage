const prettier = require('prettier');

const routes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/history', priority: '0.9', changefreq: 'weekly' },
  { path: '/timeline', priority: '0.9', changefreq: 'weekly' },
  { path: '/culture', priority: '0.9', changefreq: 'weekly' },
  { path: '/elder-stories', priority: '0.8', changefreq: 'weekly' },
  { path: '/gallery', priority: '0.8', changefreq: 'weekly' },
  { path: '/marketplace', priority: '0.8', changefreq: 'daily' },
  { path: '/virtual-tours', priority: '0.8', changefreq: 'monthly' },
  { path: '/visit', priority: '0.8', changefreq: 'monthly' },
  { path: '/diaspora', priority: '0.8', changefreq: 'weekly' },
  { path: '/environment', priority: '0.7', changefreq: 'weekly' },
  { path: '/contact', priority: '0.7', changefreq: 'monthly' },
  { path: '/login', priority: '0.5', changefreq: 'monthly' },
  { path: '/register', priority: '0.5', changefreq: 'monthly' },
  { path: '/posts', priority: '0.7', changefreq: 'daily' },
  { path: '/activity', priority: '0.6', changefreq: 'daily' },
];

const baseUrl = 'https://ke.freegameplay.site';
const today = new Date().toISOString().split('T')[0];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
         xmlns:xhtml="http://www.w3.org/1999/xhtml"
         xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
         xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
         xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
         xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${routes.map(route => `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}${route.path}"/>
    <mobile:mobile/>
  </url>`).join('\n')}
</urlset>`;

const formatted = prettier.format(xml, { parser: 'xml', printWidth: 120 });

require('fs').writeFileSync('public/sitemap.xml', formatted);
console.log('Sitemap generated successfully!');