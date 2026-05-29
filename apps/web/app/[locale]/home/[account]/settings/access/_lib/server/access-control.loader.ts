import 'server-only';

import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';

import {
  swellAccessPermissionKeys,
  swellAccessRoleKeys,
  type AppPermission,
  type SwellAccessRole,
} from '../access-control.config';

export type AccessControlData = Awaited<ReturnType<typeof loadAccessControl>>;

export const loadAccessControl = cache(async (accountSlug: string) => {
  const client = getSupabaseServerClient();
  const workspace = await loadTeamWorkspace(accountSlug);

  const canManageAccess =
    workspace.account.permissions.includes('access.manage') ||
    workspace.account.permissions.includes('roles.manage');

  const [rolesResult, permissionsResult] = await Promise.all([
    client
      .from('roles')
      .select('name,hierarchy_level')
      .in('name', swellAccessRoleKeys)
      .order('hierarchy_level', { ascending: true }),
    client
      .from('role_permissions')
      .select('role,permission')
      .in('role', swellAccessRoleKeys)
      .in('permission', swellAccessPermissionKeys),
  ]);

  if (rolesResult.error) {
    throw rolesResult.error;
  }

  if (permissionsResult.error) {
    throw permissionsResult.error;
  }

  const selectedPermissions = new Map<SwellAccessRole, Set<AppPermission>>();

  for (const role of swellAccessRoleKeys) {
    selectedPermissions.set(role, new Set());
  }

  for (const row of permissionsResult.data) {
    const role = row.role as SwellAccessRole;
    const permission = row.permission as AppPermission;
    const permissions = selectedPermissions.get(role);

    if (permissions) {
      permissions.add(permission);
    }
  }

  return {
    workspace,
    canManageAccess,
    roles: rolesResult.data,
    selectedPermissions,
  };
});
