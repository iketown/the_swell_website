import '../../styles/globals.css';

import { getFontsClassName } from '~/lib/fonts';

export default function UiLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en" className={getFontsClassName('dark')}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
