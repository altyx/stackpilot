import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { readAlertPayload } from './push';

/**
 * Opens the relevant container when the user taps an alert.
 *
 * `useLastNotificationResponse` also covers cold start: an app launched from
 * a notification gets the response on the very first render. We remember the
 * id already handled, otherwise every re-render would re-trigger the navigation.
 */
export function usePushNavigation(isAuthenticated: boolean): void {
  const response = Notifications.useLastNotificationResponse();
  const router = useRouter();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response || !isAuthenticated) return;

    const id = response.notification.request.identifier;
    if (handled.current === id) return;

    const payload = readAlertPayload(response.notification.request.content.data);
    if (!payload) return;

    handled.current = id;
    router.push(`/endpoints/${payload.endpointId}/containers/${payload.containerId}`);
  }, [response, isAuthenticated, router]);
}
