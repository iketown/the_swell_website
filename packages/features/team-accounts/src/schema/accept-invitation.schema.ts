import * as z from 'zod';

import { isSafeRedirectPath } from '@kit/shared/utils';

export const AcceptInvitationSchema = z.object({
  inviteToken: z.string().uuid(),
  nextPath: z.string().min(1).refine(isSafeRedirectPath, {
    message: 'Invalid redirect path',
  }),
});
