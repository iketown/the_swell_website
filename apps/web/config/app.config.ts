import * as z from 'zod';

const production = process.env.NODE_ENV === 'production';
const vercelPreview =
  process.env.VERCEL_ENV === 'preview' ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
const vercelPreviewUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;
const browserPreviewUrl =
  typeof window !== 'undefined' && vercelPreview
    ? window.location.origin
    : undefined;

const AppConfigSchema = z
  .object({
    name: z
      .string({
        error: `Please provide the variable NEXT_PUBLIC_PRODUCT_NAME`,
      })
      .min(1),
    title: z
      .string({
        error: `Please provide the variable NEXT_PUBLIC_SITE_TITLE`,
      })
      .min(1),
    description: z.string({
      error: `Please provide the variable NEXT_PUBLIC_SITE_DESCRIPTION`,
    }),
    url: z.url({
      message: `You are deploying a production build but have entered a NEXT_PUBLIC_SITE_URL variable using http instead of https. It is very likely that you have set the incorrect URL. The build will now fail to prevent you from from deploying a faulty configuration. Please provide the variable NEXT_PUBLIC_SITE_URL with a valid URL, such as: 'https://example.com'`,
    }),
    locale: z
      .string({
        error: `Please provide the variable NEXT_PUBLIC_DEFAULT_LOCALE`,
      })
      .default('en'),
    theme: z.enum(['light', 'dark', 'system']),
    production: z.boolean(),
    themeColor: z.string(),
    themeColorDark: z.string(),
  })
  .refine(
    (schema) => {
      const isCI = process.env.NEXT_PUBLIC_CI;

      if (isCI ?? !schema.production) {
        return true;
      }

      return !schema.url.startsWith('http:');
    },
    {
      message: `Please provide a valid HTTPS URL. Set the variable NEXT_PUBLIC_SITE_URL with a valid URL, such as: 'https://example.com'`,
      path: ['url'],
    },
  )
  .refine(
    (schema) => {
      return schema.themeColor !== schema.themeColorDark;
    },
    {
      message: `Please provide different theme colors for light and dark themes.`,
      path: ['themeColor'],
    },
  );

const appConfig = AppConfigSchema.parse({
  name:
    process.env.NEXT_PUBLIC_PRODUCT_NAME ??
    (vercelPreview ? 'The Swell' : undefined),
  title:
    process.env.NEXT_PUBLIC_SITE_TITLE ??
    (vercelPreview ? 'The Swell' : undefined),
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ??
    (vercelPreview ? 'The Swell band OS' : undefined),
  url: process.env.NEXT_PUBLIC_SITE_URL ?? vercelPreviewUrl ?? browserPreviewUrl,
  locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  theme:
    process.env.NEXT_PUBLIC_DEFAULT_THEME_MODE ??
    (vercelPreview ? 'light' : undefined),
  themeColor:
    process.env.NEXT_PUBLIC_THEME_COLOR ??
    (vercelPreview ? '#ffffff' : undefined),
  themeColorDark:
    process.env.NEXT_PUBLIC_THEME_COLOR_DARK ??
    (vercelPreview ? '#0a0a0a' : undefined),
  production,
});

export default appConfig;
