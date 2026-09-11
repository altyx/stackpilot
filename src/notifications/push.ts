import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Charge utile envoyée par le watcher, pour ouvrir le bon écran au tap. */
export interface ContainerAlertPayload {
  endpointId: number;
  containerId: string;
  containerName: string;
  reason: string;
}

export type PushRegistration =
  | { status: 'granted'; token: string }
  | { status: 'denied' }
  | { status: 'unsupported'; reason: string };

/**
 * Le jeton Expo identifie l'appareil auprès du service de push. Il est copié
 * manuellement dans la configuration du watcher : pour un usage personnel, cela
 * évite d'exposer un backend supplémentaire juste pour enregistrer un jeton.
 */
export async function registerForPush(): Promise<PushRegistration> {
  if (!Device.isDevice) {
    return {
      status: 'unsupported',
      reason:
        "Les notifications distantes exigent un appareil physique : APNs ne délivre pas de jeton à un simulateur.",
    };
  }

  // Expo Go ne reçoit plus les notifications distantes depuis le SDK 53 ;
  // sans ce test, l'appel natif échouerait sur une erreur peu explicite.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return {
      status: 'unsupported',
      reason:
        "Expo Go ne reçoit pas les notifications distantes. Installez une version compilée de l'application (dev build) pour les activer.",
    };
  }

  if (Platform.OS === 'android') {
    // Sans canal explicite, Android range les alertes en importance par défaut,
    // sans son ni bannière.
    await Notifications.setNotificationChannelAsync('containers', {
      name: 'Alertes conteneurs',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const granted =
    existing.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return { status: 'denied' };

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    return {
      status: 'unsupported',
      reason:
        "Aucun projectId EAS dans la configuration : lancez `eas init`, puis reconstruisez l'application.",
    };
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return { status: 'granted', token: data };
}

/** Lit la charge utile d'une notification, en écartant tout ce qui n'est pas conforme. */
export function readAlertPayload(data: unknown): ContainerAlertPayload | null {
  if (!data || typeof data !== 'object') return null;
  const { endpointId, containerId, containerName, reason } = data as Record<string, unknown>;
  if (typeof endpointId !== 'number' || typeof containerId !== 'string' || !containerId) {
    return null;
  }
  return {
    endpointId,
    containerId,
    containerName: typeof containerName === 'string' ? containerName : containerId.slice(0, 12),
    reason: typeof reason === 'string' ? reason : 'Changement d’état',
  };
}
