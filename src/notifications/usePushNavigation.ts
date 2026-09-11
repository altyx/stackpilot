import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { readAlertPayload } from './push';

/**
 * Ouvre le conteneur concerné quand l'utilisateur tape une alerte.
 *
 * `useLastNotificationResponse` couvre aussi le démarrage à froid : l'app lancée
 * depuis une notification reçoit la réponse dès le premier rendu. On mémorise
 * l'identifiant déjà traité, sinon chaque re-rendu relancerait la navigation.
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
