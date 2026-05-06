'use client';

import { useRouter } from 'next/navigation';

import { AccountSelector } from '@kit/accounts/account-selector';

import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

const features = {
  enableTeamCreation: featureFlagsConfig.enableTeamCreation,
};

export function HomeAccountSelector(props: {
  accounts: Array<{
    label: string | null;
    value: string | null;
    image: string | null;
  }>;

  userId: string;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const collapsed = props.collapsed ?? true;

  return (
    <AccountSelector
      collapsed={collapsed}
      accounts={props.accounts}
      features={features}
      userId={props.userId}
      onAccountChange={(value) => {
        if (value) {
          document.cookie = `last-selected-team=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

          const path = pathsConfig.app.accountHome.replace('[account]', value);
          router.replace(path);
        }
      }}
    />
  );
}
