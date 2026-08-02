export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://japanpulse.vercel.app/sitemap.xml',
    host: 'https://japanpulse.vercel.app',
  }
}
