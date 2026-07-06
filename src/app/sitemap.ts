import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://temp-marketplace.vercel.app/login',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1.0,
    },
  ];
}
