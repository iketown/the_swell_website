import { CalendarDays } from 'lucide-react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';

interface CalendarPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = () => {
  return {
    title: 'Calendar',
  };
};

export default async function CalendarPage({ params }: CalendarPageProps) {
  const account = (await params).account;

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={account}
        title="Calendar"
        description={<AppBreadcrumbs />}
      />

      <div className="w-full max-w-5xl pb-32">
        <Card>
          <CardHeader>
            <div className="text-primary flex items-center gap-2">
              <CalendarDays className="size-5" />
              <CardTitle>Calendar</CardTitle>
            </div>
            <CardDescription>
              Rehearsals and shows will appear here once the schedule module is
              wired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </PageBody>
  );
}
