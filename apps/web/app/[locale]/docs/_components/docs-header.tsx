import Link from 'next/link';

import { Header } from '@kit/ui/marketing';
import { Separator } from '@kit/ui/separator';
import { Trans } from '@kit/ui/trans';

import { AppLogo } from '~/components/app-logo';

import { DocsBackButton } from './docs-back-button';

export function DocsHeader() {
  return (
    <Header
      logo={
        <div className={'flex w-full flex-1 justify-between'}>
          <div className="flex items-center gap-x-4">
            <AppLogo href="/" />

            <Separator orientation="vertical" />

            <Link
              href="/docs"
              className="font-semibold tracking-tight hover:underline"
            >
              <Trans i18nKey="marketing.documentation" />
            </Link>
          </div>

          <DocsBackButton />
        </div>
      }
      centered={false}
      className="border-border/50 border-b px-4"
    />
  );
}
