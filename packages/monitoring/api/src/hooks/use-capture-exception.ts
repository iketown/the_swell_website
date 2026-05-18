import { useEffect } from 'react';

import { useMonitoring } from './use-monitoring';

/**
 * @name useCaptureException
 * @description Report an error to the configured monitoring service. Pass
 * `null` to skip reporting (e.g. when the error has a `digest`, meaning it
 * originated server-side and was already captured by `onRequestError`).
 */
export function useCaptureException(error: Error | null) {
  const service = useMonitoring();

  useEffect(() => {
    if (!error) return;

    void service.captureException(error);
  }, [error, service]);
}
