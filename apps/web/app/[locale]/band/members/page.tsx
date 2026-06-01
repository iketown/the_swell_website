import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';

import { TeamAccountLayoutPageHeader } from '~/home/[account]/_components/team-account-layout-page-header';
import { MembersAdmin } from '~/home/[account]/band/_components/members-admin';
import { loadBandAdminData } from '~/home/[account]/band/_lib/server/band-admin.loader';

import { loadSwellWorkspace } from '../_lib/server/swell-workspace.loader';

export const generateMetadata = () => {
  return {
    title: 'Band Members',
  };
};

export default async function BandMembersPage() {
  const workspace = await loadSwellWorkspace();
  const data = await loadBandAdminData(workspace.account.slug);
  const assignedPartCountsByMemberId = data.parts.reduce<
    Record<string, number>
  >((counts, part) => {
    if (part.default_member_id) {
      counts[part.default_member_id] =
        (counts[part.default_member_id] ?? 0) + 1;
    }

    return counts;
  }, {});

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={workspace.account.slug}
        title="Band Members"
        description={<AppBreadcrumbs />}
      />

      <MembersAdmin
        accountSlug={data.workspace.account.slug}
        assignedPartCountsByMemberId={assignedPartCountsByMemberId}
        members={data.members}
      />
    </PageBody>
  );
}
