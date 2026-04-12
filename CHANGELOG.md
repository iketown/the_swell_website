# Changelog

## [3.1.5] - 2026-04-12

### Security

- **Marketing layout**: Added `export const dynamic = 'force-dynamic'` to `[locale]/(marketing)/layout.tsx`. The layout calls `requireUser` on every render; forcing dynamic rendering explicitly guards against the segment being statically prerendered or ISR-cached by any downstream caching layer.
