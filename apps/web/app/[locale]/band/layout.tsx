import { cookies } from 'next/headers';

import * as z from 'zod';

import { TeamAccountWorkspaceContextProvider } from '@kit/team-accounts/components';
import { Page, PageMobileNavigation, PageNavigation } from '@kit/ui/page';
import { SidebarProvider } from '@kit/ui/sidebar';

import { AppLogo } from '~/components/app-logo';
import { getTeamAccountSidebarConfig } from '~/config/team-account-navigation.config';
import { TeamAccountLayoutMobileNavigation } from '~/home/[account]/_components/team-account-layout-mobile-navigation';
import { TeamAccountLayoutSidebar } from '~/home/[account]/_components/team-account-layout-sidebar';
import { TeamAccountNavigationMenu } from '~/home/[account]/_components/team-account-navigation-menu';

import { loadSwellWorkspace } from './_lib/server/swell-workspace.loader';

async function BandWorkspaceLayout({ children }: React.PropsWithChildren) {
  const data = await loadSwellWorkspace();
  const account = data.account.slug;
  const state = await getLayoutState(account);

  if (state.style === 'sidebar') {
    return (
      <TeamAccountWorkspaceContextProvider value={data}>
        <SidebarProvider defaultOpen={state.open}>
          <Page style="sidebar">
            <PageNavigation>
              <TeamAccountLayoutSidebar
                account={account}
                accountId={data.account.id}
                accounts={data.accounts.map(({ name, slug, picture_url }) => ({
                  label: name,
                  value: slug,
                  image: picture_url,
                }))}
                permissions={data.account.permissions}
                user={data.user}
              />
            </PageNavigation>

            <PageMobileNavigation>
              <AppLogo />

              <div className="flex">
                <TeamAccountLayoutMobileNavigation
                  userId={data.user.id}
                  accounts={data.accounts.map(
                    ({ name, slug, picture_url }) => ({
                      label: name,
                      value: slug,
                      image: picture_url,
                    }),
                  )}
                  account={account}
                  permissions={data.account.permissions}
                />
              </div>
            </PageMobileNavigation>

            {children}
          </Page>
        </SidebarProvider>
      </TeamAccountWorkspaceContextProvider>
    );
  }

  return (
    <TeamAccountWorkspaceContextProvider value={data}>
      <Page style="header">
        <PageNavigation>
          <TeamAccountNavigationMenu workspace={data} />
        </PageNavigation>

        <PageMobileNavigation className="flex items-center justify-between">
          <AppLogo />

          <TeamAccountLayoutMobileNavigation
            userId={data.user.id}
            accounts={data.accounts.map(({ name, slug, picture_url }) => ({
              label: name,
              value: slug,
              image: picture_url,
            }))}
            account={account}
            permissions={data.account.permissions}
          />
        </PageMobileNavigation>

        {children}
      </Page>
    </TeamAccountWorkspaceContextProvider>
  );
}

async function getLayoutState(account: string) {
  const cookieStore = await cookies();
  const config = getTeamAccountSidebarConfig(account);

  const LayoutStyleSchema = z
    .enum(['sidebar', 'header', 'custom'])
    .default(config.style);

  const sidebarOpenCookie = cookieStore.get('sidebar_state');
  const layoutCookie = cookieStore.get('layout-style');
  const layoutStyle = LayoutStyleSchema.safeParse(layoutCookie?.value);
  const sidebarOpenCookieValue = sidebarOpenCookie
    ? sidebarOpenCookie.value === 'true'
    : !config.sidebarCollapsed;

  return {
    open: sidebarOpenCookieValue,
    style: layoutStyle.success ? layoutStyle.data : config.style,
  };
}

export default BandWorkspaceLayout;
