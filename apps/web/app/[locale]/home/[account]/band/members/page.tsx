import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { MembersAdmin } from '../_components/members-admin';
import { loadBandAdminData } from '../_lib/server/band-admin.loader';

interface BandMembersPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = () => {
  return {
    title: 'Band Members',
  };
};

export default async function BandMembersPage({
  params,
}: BandMembersPageProps) {
  const account = (await params).account;
  const data = await loadBandAdminData(account);
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
        account={account}
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
