import { redirect } from 'next/navigation';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { loadBandAdminData } from '../band/_lib/server/band-admin.loader';

interface AccountPartsPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = () => {
  return {
    title: 'Parts',
  };
};

export default async function AccountPartsPage({
  params,
}: AccountPartsPageProps) {
  const account = (await params).account;
  const data = await loadBandAdminData(account);
  const currentMember = data.members.find(
    (member) => member.user_id === data.workspace.user.id,
  );
  const fallbackMember = data.members.find(
    (member) => member.status === 'active' && member.member_type === 'performer',
  );
  const selectedMember = currentMember ?? fallbackMember;

  if (selectedMember) {
    redirect(`/home/${account}/parts/${memberSlug(selectedMember.display_name)}`);
  }

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={account}
        title="Parts"
        description={<AppBreadcrumbs />}
      />

      <div className="w-full max-w-5xl pb-32">
        <Card>
          <CardHeader>
            <CardTitle>No performer parts yet</CardTitle>
            <CardDescription>
              Once active performers are created and assigned song files, their
              parts will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </PageBody>
  );
}

function memberSlug(displayName: string) {
  return displayName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
