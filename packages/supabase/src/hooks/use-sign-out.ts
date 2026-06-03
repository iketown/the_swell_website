import { useMutation } from '@tanstack/react-query';

import { useSupabase } from './use-supabase';

export function useSignOut() {
  const client = useSupabase();

  return useMutation({
    mutationFn: async () => {
      try {
        const result = await client.auth.signOut();

        if (result.error && process.env.NODE_ENV === 'development') {
          return client.auth.signOut({ scope: 'local' });
        }

        return result;
      } catch (error) {
        if (process.env.NODE_ENV !== 'development') {
          throw error;
        }

        return client.auth.signOut({ scope: 'local' });
      }
    },
  });
}
