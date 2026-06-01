import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';

import { TeamAccountLayoutPageHeader } from '~/home/[account]/_components/team-account-layout-page-header';
import { SongsAdmin } from '~/home/[account]/band/_components/band-admin-ui';
import { loadBandAdminData } from '~/home/[account]/band/_lib/server/band-admin.loader';

import { loadSwellWorkspace } from '../_lib/server/swell-workspace.loader';

interface BandSongsPageProps {
  searchParams: Promise<{ dir?: string; sort?: string; tag?: string }>;
}

export const generateMetadata = () => {
  return {
    title: 'Songs',
  };
};

export default async function BandSongsPage({
  searchParams,
}: BandSongsPageProps) {
  const workspace = await loadSwellWorkspace();
  const { dir, sort, tag } = await searchParams;
  const data = await loadBandAdminData(workspace.account.slug);

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={workspace.account.slug}
        title="Songs"
        description={<AppBreadcrumbs />}
      />

      <SongsAdmin
        basePath="/band/songs"
        data={data}
        selectedTagSlug={tag ?? null}
        sortDirection={dir}
        sortKey={sort}
      />
    </PageBody>
  );
}
