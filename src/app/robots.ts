import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/login'],
        disallow: ['/'],
      }
    ],
    sitemap: 'https://temp-marketplace.vercel.app/sitemap.xml',
  };
}
