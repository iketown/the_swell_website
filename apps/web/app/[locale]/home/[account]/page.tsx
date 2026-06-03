import Link from 'next/link';

import { CalendarDays, FileAudio } from 'lucide-react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
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
  const currentMember = data.members.find(
    (member) => member.user_id === data.workspace.user.id,
  );

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={account}
        title="Band Home"
        description={<AppBreadcrumbs />}
      />

      {data.canManageBand ? (
        <BandOverview data={data} />
      ) : (
        <PerformerHome
          accountSlug={account}
          currentMember={currentMember}
          partCount={
            currentMember
              ? data.songPartAssignments.filter(
                  (assignment) => assignment.member_id === currentMember.id,
                ).length
              : 0
          }
        />
      )}
    </PageBody>
  );
}

export default TeamAccountHomePage;

function PerformerHome({
  accountSlug,
  currentMember,
  partCount,
}: {
  accountSlug: string;
  currentMember:
    | {
        display_name: string;
      }
    | undefined;
  partCount: number;
}) {
  const partsHref = currentMember
    ? `/home/${accountSlug}/parts/${memberSlug(currentMember.display_name)}`
    : `/home/${accountSlug}/parts`;

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6 pb-32">
      {!currentMember ? (
        <Card className="border-amber-300 bg-amber-50 text-amber-950">
          <CardHeader>
            <CardTitle>Member profile not linked</CardTitle>
            <CardDescription className="text-amber-900">
              Your login is active, but it has not been matched to a band member
              profile yet. Ask an owner to check the email on your band member
              row.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <PerformerActionCard
          action="Open parts"
          description={
            currentMember
              ? `${partCount} assigned files for ${currentMember.display_name}.`
              : 'View the performer parts library.'
          }
          href={partsHref}
          icon={<FileAudio />}
          title="Parts"
        />

        <PerformerActionCard
          action="Open calendar"
          description="Upcoming rehearsals and shows will live here."
          href={`/home/${accountSlug}/calendar`}
          icon={<CalendarDays />}
          title="Calendar"
        />
      </div>
    </div>
  );
}

function PerformerActionCard({
  action,
  description,
  href,
  icon,
  title,
}: {
  action: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="text-primary flex items-center gap-2">
          <span className="[&>svg]:size-5">{icon}</span>
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button nativeButton={false} render={<Link href={href} />}>
          {action}
        </Button>
      </CardContent>
    </Card>
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
