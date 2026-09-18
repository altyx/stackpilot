import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { readAlertPayload, registerForPush } from './push';

// `__esModule` makes the namespace import share the mock object with the
// module under test, so the mutations below are seen by `registerForPush`.
jest.mock('expo-device', () => ({ __esModule: true, isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
  default: { executionEnvironment: 'bare', expoConfig: null, easConfig: null },
}));
jest.mock('expo-notifications', () => ({
  __esModule: true,
  AndroidImportance: { HIGH: 4 },
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

const device = Device as { isDevice: boolean };
const constants = Constants as unknown as {
  executionEnvironment: string;
  expoConfig: { extra?: unknown } | null;
  easConfig: { projectId?: string } | null;
};
const granted = { granted: true } as Notifications.NotificationPermissionsStatus;
const denied = { granted: false } as Notifications.NotificationPermissionsStatus;

async function unsupportedReason(): Promise<string> {
  const result = await registerForPush();
  if (result.status !== 'unsupported')
    throw new Error(`Expected unsupported, got ${result.status}`);
  return result.reason;
}

beforeEach(() => {
  device.isDevice = true;
  constants.executionEnvironment = 'bare';
  constants.expoConfig = { extra: { eas: { projectId: 'proj-1' } } };
  constants.easConfig = null;
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(granted);
  jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({
    type: 'expo',
    data: 'ExponentPushToken[abc]',
  });
});

afterEach(() => jest.restoreAllMocks());

describe('registerForPush', () => {
  it('refuses simulators', async () => {
    device.isDevice = false;
    await expect(unsupportedReason()).resolves.toContain('appareil physique');
  });

  it('refuses Expo Go', async () => {
    constants.executionEnvironment = 'storeClient';
    await expect(unsupportedReason()).resolves.toContain('Expo Go');
  });

  it('reports denied permissions', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(denied);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(denied);
    await expect(registerForPush()).resolves.toEqual({ status: 'denied' });
  });

  it('asks for permission only when not already granted', async () => {
    await registerForPush();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('needs an EAS project id', async () => {
    constants.expoConfig = { extra: {} };
    await expect(unsupportedReason()).resolves.toContain('projectId');
  });

  it('also reads the project id from the EAS config', async () => {
    constants.expoConfig = null;
    constants.easConfig = { projectId: 'proj-2' };
    await expect(registerForPush()).resolves.toEqual({
      status: 'granted',
      token: 'ExponentPushToken[abc]',
    });
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-2' });
  });

  it('returns the token without touching channels on iOS', async () => {
    await expect(registerForPush()).resolves.toEqual({
      status: 'granted',
      token: 'ExponentPushToken[abc]',
    });
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('creates a high-importance channel on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await registerForPush();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'containers',
      expect.objectContaining({ importance: 4 }),
    );
  });
});

describe('readAlertPayload', () => {
  it('accepts a complete payload', () => {
    const payload = {
      endpointId: 3,
      containerId: 'abc',
      containerName: 'web',
      reason: 'unhealthy',
    };
    expect(readAlertPayload(payload)).toEqual(payload);
  });

  it('fills in the optional fields', () => {
    expect(readAlertPayload({ endpointId: 3, containerId: 'abcdef0123456789' })).toEqual({
      endpointId: 3,
      containerId: 'abcdef0123456789',
      containerName: 'abcdef012345',
      reason: 'Changement d’état',
    });
  });

  it('rejects anything else', () => {
    expect(readAlertPayload(null)).toBeNull();
    expect(readAlertPayload('alert')).toBeNull();
    expect(readAlertPayload({ endpointId: '3', containerId: 'abc' })).toBeNull();
    expect(readAlertPayload({ endpointId: 3, containerId: '' })).toBeNull();
  });
});
