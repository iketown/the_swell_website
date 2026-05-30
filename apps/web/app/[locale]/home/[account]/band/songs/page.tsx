import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { SongsAdmin } from '../_components/band-admin-ui';
import { loadBandAdminData } from '../_lib/server/band-admin.loader';

interface BandSongsPageProps {
  params: Promise<{ account: string }>;
  searchParams: Promise<{ dir?: string; sort?: string; tag?: string }>;
}

export const generateMetadata = () => {
  return {
    title: 'Songs',
  };
};

export default async function BandSongsPage({
  params,
  searchParams,
}: BandSongsPageProps) {
  const account = (await params).account;
  const { dir, sort, tag } = await searchParams;
  const data = await loadBandAdminData(account);

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={account}
        title="Songs"
        description={<AppBreadcrumbs />}
      />

      <SongsAdmin
        data={data}
        selectedTagSlug={tag ?? null}
        sortDirection={dir}
        sortKey={sort}
      />
    </PageBody>
  );
}
