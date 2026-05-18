import { type Instrumentation } from 'next';

export async function register() {
  const { registerMonitoringInstrumentation } =
    await import('@kit/monitoring/instrumentation');

  // Register monitoring instrumentation
  // based on the MONITORING_PROVIDER environment variable.
  await registerMonitoringInstrumentation();
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const { onRequestError: handler } =
    await import('@kit/monitoring/instrumentation');

  return handler(error, request, context);
};
