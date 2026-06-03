import {
  CalendarDays,
  CreditCard,
  FileAudio,
  LibraryBig,
  Music,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

const iconClasses = 'w-4';

type Permission =
  | 'access.manage'
  | 'band.members.read'
  | 'band.members.manage'
  | 'billing.manage'
  | 'calendar.read'
  | 'members.manage'
  | 'parts.read'
  | 'parts.manage'
  | 'roles.manage'
  | 'settings.manage'
  | 'songs.read'
  | 'songs.manage';

export function isSimpleMemberExperience(permissions: string[]) {
  return !permissions.some((permission) => permission.endsWith('.manage'));
}

const getRoutes = (account: string, permissions?: string[]) => {
  const can = (permission: Permission) => {
    return !permissions || permissions.includes(permission);
  };

  const canAny = (permissionList: Permission[]) => {
    return permissionList.some((permission) => can(permission));
  };

  const routes = [
    {
      label: 'common.routes.application',
      children: [
        canAny(['parts.read', 'parts.manage'])
          ? {
              label: 'Parts',
              path: createPath('/home/[account]/parts', account),
              Icon: <FileAudio className={iconClasses} />,
            }
          : undefined,
        can('calendar.read')
          ? {
              label: 'Calendar',
              path: createPath('/home/[account]/calendar', account),
              Icon: <CalendarDays className={iconClasses} />,
            }
          : undefined,
      ].filter(Boolean),
    },
    {
      label: 'Management',
      children: [
        canAny(['band.members.manage', 'members.manage', 'songs.manage'])
          ? {
              label: 'Band Home',
              path: createPath('/home/[account]/band', account),
              Icon: <Music className={iconClasses} />,
              highlightMatch: createPath('/home/[account]/band$', account),
            }
          : undefined,
      ].filter(Boolean),
    },
    {
      label: 'Band',
      children: [
        canAny(['band.members.read', 'band.members.manage'])
          ? {
              label: 'Band Members',
              path: createPath('/home/[account]/band/members', account),
              Icon: <Users className={iconClasses} />,
            }
          : undefined,
        can('songs.manage')
          ? {
              label: 'Songs',
              path: createPath('/home/[account]/band/songs', account),
              Icon: <Music className={iconClasses} />,
            }
          : undefined,
        can('songs.manage')
          ? {
              label: 'Records',
              path: '/band/albums',
              Icon: <LibraryBig className={iconClasses} />,
            }
          : undefined,
        can('parts.manage')
          ? {
              label: 'Parts Admin',
              path: '/band/parts',
              Icon: <FileAudio className={iconClasses} />,
            }
          : undefined,
      ].filter(Boolean),
    },
    {
      label: 'common.routes.settings',
      collapsible: false,
      children: [
        can('settings.manage')
          ? {
              label: 'common.routes.settings',
              path: createPath(pathsConfig.app.accountSettings, account),
              Icon: <Settings className={iconClasses} />,
            }
          : undefined,
        can('members.manage')
          ? {
              label: 'common.routes.members',
              path: createPath(pathsConfig.app.accountMembers, account),
              Icon: <Users className={iconClasses} />,
            }
          : undefined,
        canAny(['access.manage', 'roles.manage'])
          ? {
              label: 'Access',
              path: createPath('/home/[account]/settings/access', account),
              Icon: <ShieldCheck className={iconClasses} />,
            }
          : undefined,
        featureFlagsConfig.enableTeamAccountBilling && can('billing.manage')
          ? {
              label: 'common.routes.billing',
              path: createPath(pathsConfig.app.accountBilling, account),
              Icon: <CreditCard className={iconClasses} />,
            }
          : undefined,
      ].filter(Boolean),
    },
  ];

  return routes.filter(
    (route) => !('children' in route) || route.children.length > 0,
  );
};

export function getTeamAccountSidebarConfig(
  account: string,
  permissions?: string[],
) {
  return NavigationConfigSchema.parse({
    routes: getRoutes(account, permissions),
    style: process.env.NEXT_PUBLIC_TEAM_NAVIGATION_STYLE,
    sidebarCollapsed: process.env.NEXT_PUBLIC_TEAM_SIDEBAR_COLLAPSED,
    sidebarCollapsedStyle: process.env.NEXT_PUBLIC_SIDEBAR_COLLAPSIBLE_STYLE,
  });
}

function createPath(path: string, account: string) {
  return path.replace('[account]', account);
}
