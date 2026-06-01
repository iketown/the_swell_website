import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';

import { TeamAccountLayoutPageHeader } from '~/home/[account]/_components/team-account-layout-page-header';
import { BandOverview } from '~/home/[account]/band/_components/band-admin-ui';
import { loadBandAdminData } from '~/home/[account]/band/_lib/server/band-admin.loader';

import { loadSwellWorkspace } from './_lib/server/swell-workspace.loader';

export const generateMetadata = () => {
  return {
    title: 'Band',
  };
};

export default async function BandPage() {
  const workspace = await loadSwellWorkspace();
  const data = await loadBandAdminData(workspace.account.slug);

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={workspace.account.slug}
        title="Band"
        description={<AppBreadcrumbs />}
      />

      <BandOverview data={data} />
    </PageBody>
  );
}
