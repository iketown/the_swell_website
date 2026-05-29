'use server';

import { revalidatePath } from 'next/cache';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';

import {
  swellAccessPermissionKeys,
  swellAccessRoleKeys,
  type AppPermission,
  type SwellAccessRole,
} from '../access-control.config';

const roleSet = new Set<string>(swellAccessRoleKeys);
const permissionSet = new Set<string>(swellAccessPermissionKeys);

export async function updateAccessControlAction(formData: FormData) {
  const accountSlug = formData.get('accountSlug');

  if (typeof accountSlug !== 'string' || !accountSlug) {
    throw new Error('Missing account slug');
  }

  const workspace = await loadTeamWorkspace(accountSlug);
  const canManageAccess =
    workspace.account.permissions.includes('access.manage') ||
    workspace.account.permissions.includes('roles.manage');

  if (!canManageAccess) {
    throw new Error('You do not have permission to manage access');
  }

  const selectedRows = parseSelectedPermissions(formData);
  const adminClient = getSupabaseServerAdminClient();

  const deleteResult = await adminClient
    .from('role_permissions')
    .delete()
    .in('role', swellAccessRoleKeys)
    .in('permission', swellAccessPermissionKeys);

  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (selectedRows.length > 0) {
    const insertResult = await adminClient
      .from('role_permissions')
      .insert(selectedRows);

    if (insertResult.error) {
      throw insertResult.error;
    }
  }

  revalidatePath(`/home/${accountSlug}/settings/access`);
  revalidatePath(`/home/${accountSlug}`);
}

function parseSelectedPermissions(formData: FormData) {
  const rows: Array<{
    role: SwellAccessRole;
    permission: AppPermission;
  }> = [];

  for (const [key, value] of formData.entries()) {
    if (value !== 'on' || !key.startsWith('permission:')) {
      continue;
    }

    const [, role, permission] = key.split(':');

    if (!role || !permission) {
      continue;
    }

    if (!roleSet.has(role) || !permissionSet.has(permission)) {
      continue;
    }

    rows.push({
      role: role as SwellAccessRole,
      permission: permission as AppPermission,
    });
  }

  return rows;
}
