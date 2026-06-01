import 'server-only';
import { cache } from 'react';

import { redirect } from 'next/navigation';

import { loadUserWorkspace } from '~/home/(user)/_lib/server/load-user-workspace';
import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';

const configuredAccountSlug =
  process.env.SWELL_ACCOUNT_SLUG ??
  process.env.NEXT_PUBLIC_SWELL_ACCOUNT_SLUG ??
  'the-swell';

export const loadSwellWorkspace = cache(async () => {
  const userWorkspace = await loadUserWorkspace();
  const accountSlug =
    userWorkspace.accounts.find(
      (account) => account.value === configuredAccountSlug,
    )?.value ??
    userWorkspace.accounts.find((account) => account.value === 'the-swell')
      ?.value ??
    userWorkspace.accounts[0]?.value;

  if (!accountSlug) {
    redirect('/home/create-team');
  }

  return loadTeamWorkspace(accountSlug);
});
