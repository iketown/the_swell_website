import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';

import { TeamAccountLayoutPageHeader } from './_components/team-account-layout-page-header';
import { BandOverview } from './band/_components/band-admin-ui';
import { loadBandAdminData } from './band/_lib/server/band-admin.loader';

interface TeamAccountHomePageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = () => {
  return {
    title: 'Band Home',
  };
};

async function TeamAccountHomePage({ params }: TeamAccountHomePageProps) {
  const account = (await params).account;
  const data = await loadBandAdminData(account);

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={account}
        title="Band Home"
        description={<AppBreadcrumbs />}
      />

      <BandOverview data={data} />
    </PageBody>
  );
}

export default TeamAccountHomePage;
