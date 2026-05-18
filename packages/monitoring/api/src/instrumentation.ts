import { type Instrumentation } from 'next';

import { createRegistry } from '@kit/shared/registry';

import {
  MonitoringProvider,
  getMonitoringProvider,
} from './get-monitoring-provider';

type InstrumentationRegistration = {
  register: () => Promise<void> | void;
  // Required. The client uses `error.digest` to skip re-reporting server
  // errors in `error.tsx` / `global-error.tsx`. That dedup is only safe if
  // every provider captures server errors here.
  onRequestError: Instrumentation.onRequestError;
};

const instrumentationRegistry = createRegistry<
  InstrumentationRegistration,
  NonNullable<MonitoringProvider>
>();

instrumentationRegistry.register('sentry', async () => {
  const [{ initializeSentryServerClient }, { captureRequestError }] =
    await Promise.all([
      import('@kit/sentry/config/server'),
      import('@sentry/nextjs'),
    ]);

  return {
    register: () => {
      initializeSentryServerClient({
        environment:
          process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV,
      });
    },
    onRequestError: captureRequestError,
  };
});

/**
 * @name registerMonitoringInstrumentation
 * @description Register monitoring instrumentation based on the
 * NEXT_PUBLIC_MONITORING_PROVIDER environment variable.
 */
export async function registerMonitoringInstrumentation() {
  const provider = getMonitoringProvider();

  if (!provider) return;

  const instrumentation = await instrumentationRegistry.get(provider);

  return instrumentation.register();
}

/**
 * @name onRequestError
 * @description Forward request-lifecycle errors to the configured monitoring
 * provider. Providers should implement this to record errors with the proper
 * Next.js context (route, method, headers, etc.).
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const provider = getMonitoringProvider();

  if (!provider) {
    return;
  }

  const instrumentation = await instrumentationRegistry.get(provider);

  return instrumentation.onRequestError(error, request, context);
};
