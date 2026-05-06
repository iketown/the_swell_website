import { getLocale, getTranslations } from 'next-intl/server';

import { SitePageHeader } from '../(marketing)/_components/site-page-header';
import { DocsCards } from './_components/docs-cards';
import { getDocs } from './_lib/server/docs.loader';

type DocsPageProps = {
  params: Promise<{ locale?: string }>;
};

export const generateMetadata = async () => {
  const t = await getTranslations('marketing');

  return {
    title: t('documentation'),
  };
};

async function DocsPage({ params }: DocsPageProps) {
  const t = await getTranslations('marketing');
  let { locale } = await params;

  if (!locale) {
    locale = await getLocale();
  }

  return (
    <div className={'flex w-full flex-1 flex-col gap-y-6 xl:gap-y-8'}>
      <SitePageHeader
        title={t('documentation')}
        subtitle={t('documentationSubtitle')}
      />

      <div className={'relative flex size-full justify-center overflow-y-auto'}>
        <DocsCardsList locale={locale} />
      </div>
    </div>
  );
}

async function DocsCardsList({ locale }: { locale: string }) {
  const items = await getDocs(locale);

  // Filter out any docs that have a parentId, as these are children of other docs
  const cards = items.filter((item) => !item.parentId);

  return (
    <div className="container">
      <div className={'flex flex-1 flex-col'}>
        <DocsCards cards={cards} />
      </div>
    </div>
  );
}

export default DocsPage;
