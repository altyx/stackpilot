import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Payload sent by the watcher, to open the right screen on tap. */
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
 * The Expo token identifies the device to the push service. It's copied
 * manually into the watcher's configuration: for personal use, this avoids
 * exposing an extra backend just to register a token.
 */
export async function registerForPush(): Promise<PushRegistration> {
  if (!Device.isDevice) {
    return {
      status: 'unsupported',
      reason:
        'Remote notifications need a physical device: APNs does not issue a token to a simulator.',
    };
  }

  // Expo Go no longer receives remote notifications since SDK 53; without
  // this check, the native call would fail with a cryptic error.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return {
      status: 'unsupported',
      reason:
        'Expo Go does not receive remote notifications. Install a compiled build of the app (dev build) to turn them on.',
    };
  }

  if (Platform.OS === 'android') {
    // Without an explicit channel, Android files alerts at default importance,
    // with no sound or banner.
    await Notifications.setNotificationChannelAsync('containers', {
      name: 'Container alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const granted = existing.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return { status: 'denied' };

  // `extra` is untyped on Expo's side: validate rather than trust.
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: unknown } } | undefined;
  const easConfig = Constants.easConfig as { projectId?: unknown } | null;
  const projectId = [extra?.eas?.projectId, easConfig?.projectId].find(
    (value): value is string => typeof value === 'string',
  );
  if (!projectId) {
    return {
      status: 'unsupported',
      reason: 'No EAS projectId in the configuration: run `eas init`, then rebuild the app.',
    };
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return { status: 'granted', token: data };
}

/** Reads a notification's payload, discarding anything that doesn't conform. */
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
    reason: typeof reason === 'string' ? reason : 'State change',
  };
}
