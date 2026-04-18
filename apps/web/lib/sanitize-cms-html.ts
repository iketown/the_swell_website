const CMS_EXCERPT_ALLOWED_TAGS = [
  'a',
  'br',
  'em',
  'li',
  'ol',
  'p',
  'strong',
  'ul',
];

const CMS_EXCERPT_ALLOWED_ATTR: Record<string, string[]> = {
  a: ['href', 'rel', 'target'],
};

export async function sanitizeCmsExcerptHtml(html: string) {
  const { default: sanitizeHtml } = await import('sanitize-html');

  return sanitizeHtml(html, {
    allowedTags: CMS_EXCERPT_ALLOWED_TAGS,
    allowedAttributes: CMS_EXCERPT_ALLOWED_ATTR,
  });
}
