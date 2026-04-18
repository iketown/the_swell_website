import DOMPurify from 'isomorphic-dompurify';

const CMS_EXCERPT_ALLOWED_TAGS = ['a', 'br', 'em', 'li', 'ol', 'p', 'strong', 'ul'];
const CMS_EXCERPT_ALLOWED_ATTR = ['href', 'rel', 'target'];

export function sanitizeCmsExcerptHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: CMS_EXCERPT_ALLOWED_TAGS,
    ALLOWED_ATTR: CMS_EXCERPT_ALLOWED_ATTR,
  });
}
