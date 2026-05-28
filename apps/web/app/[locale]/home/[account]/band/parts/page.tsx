import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { PartsAdmin } from '../_components/band-admin-ui';
import { loadBandAdminData } from '../_lib/server/band-admin.loader';

interface BandPartsPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = () => {
  return {
    title: 'Parts',
  };
};

export default async function BandPartsPage({ params }: BandPartsPageProps) {
  const account = (await params).account;
  const data = await loadBandAdminData(account);

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={account}
        title="Parts"
        description={<AppBreadcrumbs />}
      />

      <PartsAdmin data={data} />
    </PageBody>
  );
}
