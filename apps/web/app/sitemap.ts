import { MetadataRoute } from 'next';

import { createCmsClient } from '@kit/cms';

import appConfig from '~/config/app.config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = getPaths();
  const contentItems = await getContentItems();

  return transformSitemapEntries([...paths, ...contentItems]);
}

function getPaths() {
  const paths = [
    '/',
    '/faq',
    '/blog',
    '/docs',
    '/changelog',
    '/pricing',
    '/contact',
    '/cookie-policy',
    '/terms-of-service',
    '/privacy-policy',
    // add more paths here
  ];

  return paths.map((path) => {
    return {
      priority: path === '/' ? 1 : 0.8,
      loc: new URL(path, appConfig.url).href,
      lastmod: new Date().toISOString(),
      changeFrequency: 'always' as const,
    };
  });
}

async function getContentItems() {
  if (!process.env.CMS_CLIENT) {
    return [];
  }

  const client = await createCmsClient();

  // do not paginate the content items
  const limit = Infinity;

  const posts = client
    .getContentItems({
      collection: 'posts',
      content: false,
      limit,
    })
    .then((response) => response.items)
    .then((posts) =>
      posts.map((post) => ({
        loc: new URL(`/blog/${post.slug}`, appConfig.url).href,
        lastmod: post.publishedAt
          ? new Date(post.publishedAt).toISOString()
          : new Date().toISOString(),
        priority: 0.8,
        changeFrequency: 'always' as const,
      })),
    );

  const docs = client
    .getContentItems({
      collection: 'documentation',
      content: false,
      limit,
    })
    .then((response) => response.items)
    .then((docs) =>
      docs.map((doc) => ({
        loc: new URL(`/docs/${doc.slug}`, appConfig.url).href,
        lastmod: doc.publishedAt
          ? new Date(doc.publishedAt).toISOString()
          : new Date().toISOString(),
        priority: 0.8,
        changeFrequency: 'always' as const,
      })),
    );

  const changelog = client
    .getContentItems({
      collection: 'changelog',
      content: false,
      limit,
    })
    .then((response) => response.items)
    .then((docs) =>
      docs.map((doc) => ({
        loc: new URL(`/changelog/${doc.slug}`, appConfig.url).href,
        lastmod: doc.publishedAt
          ? new Date(doc.publishedAt).toISOString()
          : new Date().toISOString(),
        priority: 0.5,
        changeFrequency: 'weekly' as const,
      })),
    );

  return Promise.all([posts, docs, changelog]).then((items) => items.flat());
}

function transformSitemapEntries(
  entries: {
    loc: string;
    lastmod: string;
    priority: number;
    changeFrequency:
      | 'always'
      | 'hourly'
      | 'daily'
      | 'weekly'
      | 'monthly'
      | 'yearly'
      | 'never';
  }[],
): MetadataRoute.Sitemap {
  return entries.map((entry) => {
    return {
      url: entry.loc,
      lastModified: entry.lastmod,
      priority: entry.priority,
      changeFrequency: entry.changeFrequency,
    };
  });
}
