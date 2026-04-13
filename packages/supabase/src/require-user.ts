import type { SupabaseClient } from '@supabase/supabase-js';

import { checkRequiresMultiFactorAuthentication } from './check-requires-mfa';
import { JWTUserData } from './types';

const MULTI_FACTOR_AUTH_VERIFY_PATH = '/auth/verify';
const SIGN_IN_PATH = '/auth/sign-in';

/**
 * @name requireUser
 * @description Require a session to be present in the request
 * @param client
 * @param options
 * @param options.verifyMfa
 * @param options.next
 */
export async function requireUser(
  client: SupabaseClient,
  options?: {
    verifyMfa?: boolean;
    next?: string;
  },
): Promise<
  | {
      error: null;
      data: JWTUserData;
    }
  | (
      | {
          error: AuthenticationError;
          data: null;
          redirectTo: string;
        }
      | {
          error: MultiFactorAuthError;
          data: null;
          redirectTo: string;
        }
    )
> {
  const { data, error } = await client.auth.getClaims();

  if (!data?.claims || error) {
    return {
      data: null,
      error: new AuthenticationError(),
      redirectTo: getRedirectTo(SIGN_IN_PATH, options?.next),
    };
  }

  const { verifyMfa = true } = options ?? {};

  if (verifyMfa) {
    const requiresMfa = await checkRequiresMultiFactorAuthentication(client);

    // If the user requires multi-factor authentication,
    // redirect them to the page where they can verify their identity.
    if (requiresMfa) {
      return {
        data: null,
        error: new MultiFactorAuthError(),
        redirectTo: getRedirectTo(MULTI_FACTOR_AUTH_VERIFY_PATH, options?.next),
      };
    }
  }

  const role = data.claims.app_metadata?.role;

  return {
    error: null,
    data: {
      is_anonymous: data.claims.is_anonymous || false,
      aal: data.claims.aal,
      email: data.claims.email,
      phone: data.claims.phone,
      is_superadmin: role === 'super-admin' && data.claims.aal === 'aal2',
      id: data.claims.sub,
      amr: data.claims.amr,
    },
  };
}

class AuthenticationError extends Error {
  constructor() {
    super(`Authentication required`);
  }
}

export class MultiFactorAuthError extends Error {
  constructor() {
    super(`Multi-factor authentication required`);
  }
}

function getRedirectTo(path: string, next?: string) {
  return path + (next ? `?next=${next}` : '');
}
