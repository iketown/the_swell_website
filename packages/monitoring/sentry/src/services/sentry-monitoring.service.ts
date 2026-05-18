import {
  ExclusiveEventHintOrCaptureContext,
  Event as SentryEvent,
  User as SentryUser,
  captureEvent,
  captureException,
  setUser,
} from '@sentry/nextjs';

import { MonitoringService } from '@kit/monitoring-core';

/**
 * Thin wrapper around Sentry's capture / identify APIs. Initialization is
 * owned externally: `@kit/monitoring/instrumentation-client` on the browser,
 * `@kit/monitoring/instrumentation`'s `register()` on the server.
 */
export class SentryMonitoringService implements MonitoringService {
  ready() {
    return Promise.resolve();
  }

  captureException(
    error: Error | null,
    context?: ExclusiveEventHintOrCaptureContext,
  ) {
    return captureException(error, context);
  }

  captureEvent<Extra extends SentryEvent>(event: string, extra?: Extra) {
    return captureEvent({
      message: event,
      ...(extra ?? {}),
    });
  }

  identifyUser(user: SentryUser) {
    setUser(user);
  }
}
