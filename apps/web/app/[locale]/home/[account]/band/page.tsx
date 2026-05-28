import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { BandOverview } from './_components/band-admin-ui';
import { loadBandAdminData } from './_lib/server/band-admin.loader';

interface BandPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = () => {
  return {
    title: 'Band',
  };
};

export default async function BandPage({ params }: BandPageProps) {
  const account = (await params).account;
  const data = await loadBandAdminData(account);

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={account}
        title="Band"
        description={<AppBreadcrumbs />}
      />

      <BandOverview data={data} />
    </PageBody>
  );
}
